
-- Bills
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'normal',
  paid boolean NOT NULL DEFAULT false,
  paid_on date,
  notes text,
  recurring boolean NOT NULL DEFAULT false,
  recurring_frequency text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bills" ON public.bills FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Debts
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starting_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  minimum_payment numeric NOT NULL DEFAULT 0,
  due_date date,
  interest_rate numeric,
  priority text NOT NULL DEFAULT 'normal',
  debt_type text NOT NULL DEFAULT 'other',
  notes text,
  paid_off boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage debts" ON public.debts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_debts_updated BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.debt_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'cash',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage debt_payments" ON public.debt_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Recompute debt balance after payments
CREATE OR REPLACE FUNCTION public.recompute_debt_balance(_debt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_paid numeric := 0;
  v_start numeric := 0;
  v_current numeric := 0;
BEGIN
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.debt_payments WHERE debt_id = _debt_id;
  SELECT starting_balance INTO v_start FROM public.debts WHERE id = _debt_id;
  v_current := GREATEST(v_start - v_paid, 0);
  UPDATE public.debts SET current_balance = v_current, paid_off = (v_current <= 0), updated_at = now() WHERE id = _debt_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_debt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_debt_balance(COALESCE(NEW.debt_id, OLD.debt_id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_debt_payment_change
AFTER INSERT OR UPDATE OR DELETE ON public.debt_payments
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_debt();

-- Allocation presets
CREATE TABLE public.allocation_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  buckets jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.allocation_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage allocation_presets" ON public.allocation_presets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_alloc_updated BEFORE UPDATE ON public.allocation_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed presets
INSERT INTO public.allocation_presets (name, is_active, buckets) VALUES
('Emergency Mode', true, '[
  {"name":"Emergency Debt","percent":75,"color":"destructive","enabled":true},
  {"name":"Taxes","percent":10,"color":"accent","enabled":true},
  {"name":"Survival Bills","percent":15,"color":"secondary","enabled":true}
]'::jsonb),
('Wealth Mode', false, '[
  {"name":"Taxes","percent":25,"color":"accent","enabled":true},
  {"name":"Bills","percent":30,"color":"secondary","enabled":true},
  {"name":"Emergency Fund","percent":20,"color":"success","enabled":true},
  {"name":"Real Estate Fund","percent":15,"color":"primary","enabled":true},
  {"name":"Owner / Family / Fun","percent":10,"color":"muted","enabled":true}
]'::jsonb);

-- Job expenses
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS other_expenses numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS worker_labor_cost numeric NOT NULL DEFAULT 0;
