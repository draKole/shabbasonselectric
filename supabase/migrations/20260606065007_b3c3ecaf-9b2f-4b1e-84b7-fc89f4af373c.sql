
-- =========================================================
-- 1. PROPERTIES
-- =========================================================
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  nickname text,
  property_type text NOT NULL DEFAULT 'personal_home'
    CHECK (property_type IN ('personal_home','investment','rental','commercial','nonprofit','other')),
  owner_name text,
  owner_phone text,
  address text,
  city text,
  state text DEFAULT 'OH',
  zip text,
  notes text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage properties" ON public.properties
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_properties_updated BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_properties_customer ON public.properties(customer_id);

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_property ON public.jobs(property_id);

-- Backfill: one property per (customer, normalized address)
WITH src AS (
  SELECT
    j.id AS job_id,
    j.customer_id,
    NULLIF(TRIM(COALESCE(j.address,'')), '') AS addr,
    NULLIF(TRIM(COALESCE(j.city,'')), '') AS city,
    NULLIF(TRIM(COALESCE(j.state,'')), '') AS state,
    NULLIF(TRIM(COALESCE(j.zip,'')), '') AS zip
  FROM public.jobs j
  WHERE j.property_id IS NULL
),
dedup AS (
  SELECT DISTINCT customer_id, addr, city, state, zip
  FROM src
  WHERE customer_id IS NOT NULL
),
inserted AS (
  INSERT INTO public.properties(customer_id, address, city, state, zip, property_type, is_primary)
  SELECT customer_id, addr, city, state, zip, 'personal_home',
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY addr NULLS LAST) = 1
  FROM dedup
  RETURNING id, customer_id, address, city, state, zip
)
UPDATE public.jobs j
SET property_id = i.id
FROM inserted i, src s
WHERE j.id = s.job_id
  AND s.customer_id = i.customer_id
  AND COALESCE(s.addr,'') = COALESCE(i.address,'')
  AND COALESCE(s.city,'') = COALESCE(i.city,'')
  AND COALESCE(s.state,'') = COALESCE(i.state,'')
  AND COALESCE(s.zip,'') = COALESCE(i.zip,'');

-- =========================================================
-- 2. BILL OCCURRENCES (per-month status for recurring bills)
-- =========================================================
CREATE TABLE public.bill_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  due_date date,
  amount numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  paid_on date,
  paid_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bill_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bill_occurrences TO authenticated;
GRANT ALL ON public.bill_occurrences TO service_role;
ALTER TABLE public.bill_occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bill occurrences" ON public.bill_occurrences
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_bill_occurrences_updated BEFORE UPDATE ON public.bill_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_bill_occurrences_period ON public.bill_occurrences(period_month);
CREATE INDEX idx_bill_occurrences_bill ON public.bill_occurrences(bill_id);

-- Backfill current-month occurrence for existing recurring bills
INSERT INTO public.bill_occurrences(bill_id, period_month, due_date, amount, paid, paid_on, paid_amount)
SELECT b.id, date_trunc('month', now())::date, b.due_date, b.amount, b.paid, b.paid_on,
       CASE WHEN b.paid THEN b.amount ELSE 0 END
FROM public.bills b
WHERE b.recurring = true
ON CONFLICT (bill_id, period_month) DO NOTHING;

-- =========================================================
-- 3. ALLOCATIONS / OWNER PAY TRANSFERS / PERSONAL ASSIGNMENTS
-- =========================================================
CREATE TABLE public.allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_week date NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('job_payment','manual_business','manual_personal')),
  source_id uuid,
  gross_amount numeric NOT NULL DEFAULT 0,
  direct_costs numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  owner_pay_amount numeric NOT NULL DEFAULT 0,
  overhead_amount numeric NOT NULL DEFAULT 0,
  reserve_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unallocated'
    CHECK (status IN ('unallocated','allocated','transferred','spent','locked')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.allocations TO authenticated;
GRANT ALL ON public.allocations TO service_role;
ALTER TABLE public.allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage allocations" ON public.allocations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_allocations_updated BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_allocations_week ON public.allocations(period_week);
CREATE INDEX idx_allocations_status ON public.allocations(status);
CREATE UNIQUE INDEX idx_allocations_source ON public.allocations(source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE TABLE public.owner_pay_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  transferred_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending','paid')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_pay_transfers TO authenticated;
GRANT ALL ON public.owner_pay_transfers TO service_role;
ALTER TABLE public.owner_pay_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage owner pay transfers" ON public.owner_pay_transfers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_owner_pay_transfers_updated BEFORE UPDATE ON public.owner_pay_transfers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.personal_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_transfer_id uuid REFERENCES public.owner_pay_transfers(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('bill_occurrence','debt','emergency','other')),
  target_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','paid','spent')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_assignments TO authenticated;
GRANT ALL ON public.personal_assignments TO service_role;
ALTER TABLE public.personal_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage personal assignments" ON public.personal_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_personal_assignments_updated BEFORE UPDATE ON public.personal_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE VIEW public.v_allocation_available AS
  SELECT * FROM public.allocations WHERE status IN ('unallocated','allocated');
GRANT SELECT ON public.v_allocation_available TO authenticated;
GRANT SELECT ON public.v_allocation_available TO service_role;

-- Seed business-split settings
INSERT INTO public.app_settings(key, value) VALUES
  ('business_split_owner_pct', '85'),
  ('business_split_overhead_pct', '10'),
  ('business_split_reserve_pct', '5')
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 4. LEAD NOTIFICATION SETTINGS + LOG
-- =========================================================
CREATE TABLE public.lead_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_enabled boolean NOT NULL DEFAULT false,
  alert_phone text,
  alert_email text,
  from_number text,
  notify_service_request boolean NOT NULL DEFAULT true,
  notify_contact_form boolean NOT NULL DEFAULT true,
  notify_voucher_request boolean NOT NULL DEFAULT true,
  notify_application boolean NOT NULL DEFAULT false,
  notify_estimate_request boolean NOT NULL DEFAULT true,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_notification_settings TO authenticated;
GRANT ALL ON public.lead_notification_settings TO service_role;
ALTER TABLE public.lead_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage lead settings" ON public.lead_notification_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_lead_notification_settings_updated BEFORE UPDATE ON public.lead_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.lead_notification_settings(singleton) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.lead_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_type text NOT NULL,
  ok boolean NOT NULL DEFAULT false,
  error text,
  payload jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lead_alert_log TO authenticated;
GRANT ALL ON public.lead_alert_log TO service_role;
ALTER TABLE public.lead_alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lead alert log" ON public.lead_alert_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Service role inserts lead alert log" ON public.lead_alert_log
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX idx_lead_alert_log_sent ON public.lead_alert_log(sent_at DESC);
