
-- PART 1: Employee Savings
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS savings_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS savings_type text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS savings_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_fixed numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS savings_auth_received boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS savings_auth_date date,
  ADD COLUMN IF NOT EXISTS savings_destination text,
  ADD COLUMN IF NOT EXISTS savings_notes text;

ALTER TABLE public.paystubs
  ADD COLUMN IF NOT EXISTS employee_savings numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.worker_savings_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  txn_type text NOT NULL DEFAULT 'withheld',
  amount numeric NOT NULL DEFAULT 0,
  paystub_id uuid,
  method text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_savings_ledger_worker ON public.worker_savings_ledger(worker_id);
CREATE INDEX IF NOT EXISTS idx_savings_ledger_date ON public.worker_savings_ledger(entry_date);

ALTER TABLE public.worker_savings_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage worker_savings_ledger"
  ON public.worker_savings_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Worker reads own savings ledger"
  ON public.worker_savings_ledger FOR SELECT TO authenticated
  USING (worker_id = public.my_worker_id());

-- PART 2: Vouchers
CREATE TABLE IF NOT EXISTS public.voucher_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount_paid numeric NOT NULL DEFAULT 0,
  credit_value numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  labor_only boolean NOT NULL DEFAULT true,
  materials_included boolean NOT NULL DEFAULT false,
  min_job_size numeric,
  max_per_job numeric,
  active boolean NOT NULL DEFAULT true,
  terms text,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voucher_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage voucher_offers" ON public.voucher_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public reads active voucher_offers" ON public.voucher_offers FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE TABLE IF NOT EXISTS public.service_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  customer_id uuid,
  customer_name_snapshot text,
  customer_phone text,
  customer_email text,
  offer_id uuid,
  amount_paid numeric NOT NULL DEFAULT 0,
  credit_value numeric NOT NULL DEFAULT 0,
  credit_used numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  expires_on date,
  status text NOT NULL DEFAULT 'active',
  payment_method text,
  labor_only boolean NOT NULL DEFAULT true,
  materials_included boolean NOT NULL DEFAULT false,
  terms text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vouchers_customer ON public.service_vouchers(customer_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON public.service_vouchers(status);
ALTER TABLE public.service_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage service_vouchers" ON public.service_vouchers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id uuid NOT NULL,
  job_id uuid,
  amount_applied numeric NOT NULL DEFAULT 0,
  applied_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_redemptions_voucher ON public.voucher_redemptions(voucher_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_job ON public.voucher_redemptions(job_id);
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage voucher_redemptions" ON public.voucher_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.voucher_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text,
  email text,
  offer_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voucher_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request voucher" ON public.voucher_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins manage voucher_requests" ON public.voucher_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Triggers for updated_at
CREATE TRIGGER touch_voucher_offers BEFORE UPDATE ON public.voucher_offers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_service_vouchers BEFORE UPDATE ON public.service_vouchers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed voucher offers
INSERT INTO public.voucher_offers (name, amount_paid, credit_value, bonus, labor_only, display_order)
VALUES
  ('Pay $200, get $350 labor credit', 200, 350, 150, true, 1),
  ('Pay $500, get $800 labor credit', 500, 800, 300, true, 2),
  ('Pay $1,000, get $1,500 labor credit', 1000, 1500, 500, true, 3)
ON CONFLICT DO NOTHING;

-- Seed app_settings
INSERT INTO public.app_settings (key, value) VALUES
  ('savings_enabled_default', 'no'),
  ('savings_default_type', 'percent'),
  ('savings_default_pct', '5'),
  ('savings_default_fixed', '0'),
  ('savings_require_auth', 'yes'),
  ('savings_policy_text', 'Employee Savings Deduction is voluntary and worker-owned. Amounts deducted from pay remain the worker''s money and are tracked as savings owed/held for the worker until released or sent to the chosen destination. This is not retirement, not company profit, and not forfeitable if the worker leaves.'),
  ('savings_destination_note', ''),
  ('voucher_default_terms', 'Voucher applies to labor only unless otherwise stated. Materials, permits, inspections, emergency calls, and specialty equipment are separate. Customer must schedule at least 7 days in advance. Voucher is not redeemable for cash unless required by law. Voucher may not be combined with other discounts unless approved by Shabba & Sons Electric.'),
  ('voucher_min_schedule_days', '7')
ON CONFLICT (key) DO NOTHING;
