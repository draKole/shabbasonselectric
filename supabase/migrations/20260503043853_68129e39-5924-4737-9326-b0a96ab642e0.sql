
-- Extend enums
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'deposit_paid';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'refunded';

-- New columns on jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS job_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 125,
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Backfill job_total from existing estimate_amount where empty
UPDATE public.jobs SET job_total = COALESCE(NULLIF(job_total,0), estimate_amount, 0);

-- Materials table
CREATE TABLE IF NOT EXISTS public.job_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  description text NOT NULL,
  vendor text,
  cost numeric NOT NULL DEFAULT 0,
  paid_by text NOT NULL DEFAULT 'me' CHECK (paid_by IN ('me','customer')),
  purchased_on date DEFAULT CURRENT_DATE,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage job_materials" ON public.job_materials;
CREATE POLICY "Admins manage job_materials" ON public.job_materials
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON public.job_materials(job_id);

-- Payments table
CREATE TABLE IF NOT EXISTS public.job_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  receipt_url text,
  is_deposit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage job_payments" ON public.job_payments;
CREATE POLICY "Admins manage job_payments" ON public.job_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_job_payments_job ON public.job_payments(job_id);

-- Rollup function: recompute amount_paid, materials_cost (paid by me), balance_due, payment_status
CREATE OR REPLACE FUNCTION public.recompute_job_totals(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric := 0;
  v_deposit numeric := 0;
  v_materials_me numeric := 0;
  v_total numeric := 0;
  v_balance numeric := 0;
  v_status payment_status;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(amount) FILTER (WHERE is_deposit),0)
    INTO v_paid, v_deposit FROM public.job_payments WHERE job_id = _job_id;
  SELECT COALESCE(SUM(cost),0) INTO v_materials_me
    FROM public.job_materials WHERE job_id = _job_id AND paid_by = 'me';
  SELECT COALESCE(NULLIF(job_total,0), estimate_amount, 0) INTO v_total
    FROM public.jobs WHERE id = _job_id;
  v_balance := GREATEST(v_total - v_paid, 0);
  IF v_total > 0 AND v_paid >= v_total THEN
    v_status := 'paid';
  ELSIF v_paid > 0 AND v_deposit >= v_paid THEN
    v_status := 'deposit_paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;
  UPDATE public.jobs
    SET amount_paid = v_paid,
        materials_cost = v_materials_me,
        balance_due = v_balance,
        payment_status = v_status,
        updated_at = now()
    WHERE id = _job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recompute_job_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_job_totals(COALESCE(NEW.job_id, OLD.job_id));
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS payments_recompute ON public.job_payments;
CREATE TRIGGER payments_recompute AFTER INSERT OR UPDATE OR DELETE ON public.job_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_job_totals();

DROP TRIGGER IF EXISTS materials_recompute ON public.job_materials;
CREATE TRIGGER materials_recompute AFTER INSERT OR UPDATE OR DELETE ON public.job_materials
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_job_totals();

-- Recompute when job_total changes
CREATE OR REPLACE FUNCTION public.trg_job_total_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.job_total IS DISTINCT FROM OLD.job_total THEN
    PERFORM public.recompute_job_totals(NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS jobs_total_recompute ON public.jobs;
CREATE TRIGGER jobs_total_recompute AFTER UPDATE OF job_total ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.trg_job_total_changed();

-- Receipts bucket (private)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('receipts','receipts', false)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read receipts" ON storage.objects;
CREATE POLICY "Admins read receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins write receipts" ON storage.objects;
CREATE POLICY "Admins write receipts" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins update receipts" ON storage.objects;
CREATE POLICY "Admins update receipts" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts' AND has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admins delete receipts" ON storage.objects;
CREATE POLICY "Admins delete receipts" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts' AND has_role(auth.uid(),'admin'));
