
-- =====================================================
-- 1. JOB BALANCE BUG FIX
-- =====================================================

-- Extend recompute to also subtract voucher credit applied
CREATE OR REPLACE FUNCTION public.recompute_job_totals(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_paid numeric := 0;
  v_deposit numeric := 0;
  v_materials_me numeric := 0;
  v_voucher numeric := 0;
  v_total numeric := 0;
  v_balance numeric := 0;
  v_status payment_status;
BEGIN
  SELECT COALESCE(SUM(amount),0), COALESCE(SUM(amount) FILTER (WHERE is_deposit),0)
    INTO v_paid, v_deposit FROM public.job_payments WHERE job_id = _job_id;
  SELECT COALESCE(SUM(cost),0) INTO v_materials_me
    FROM public.job_materials WHERE job_id = _job_id AND paid_by = 'me';
  SELECT COALESCE(SUM(amount_applied),0) INTO v_voucher
    FROM public.voucher_redemptions WHERE job_id = _job_id;
  SELECT COALESCE(NULLIF(job_total,0), estimate_amount, 0) INTO v_total
    FROM public.jobs WHERE id = _job_id;
  v_balance := GREATEST(v_total - v_paid - v_voucher, 0);
  IF v_total > 0 AND (v_paid + v_voucher) >= v_total THEN
    v_status := 'paid';
  ELSIF v_paid > 0 AND v_deposit >= v_paid THEN
    v_status := 'deposit_paid';
  ELSIF v_paid > 0 OR v_voucher > 0 THEN
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

-- Trigger: recompute when a job is INSERTED or its total changes
CREATE OR REPLACE FUNCTION public.trg_job_recompute_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recompute_job_totals(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_jobs_after_insert_recompute ON public.jobs;
CREATE TRIGGER trg_jobs_after_insert_recompute
AFTER INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.trg_job_recompute_on_change();

-- Replace existing job_total change trigger
DROP TRIGGER IF EXISTS trg_jobs_after_update_total ON public.jobs;
CREATE TRIGGER trg_jobs_after_update_total
AFTER UPDATE OF job_total, estimate_amount ON public.jobs
FOR EACH ROW
WHEN (OLD.job_total IS DISTINCT FROM NEW.job_total OR OLD.estimate_amount IS DISTINCT FROM NEW.estimate_amount)
EXECUTE FUNCTION public.trg_job_recompute_on_change();

-- Voucher redemption trigger
CREATE OR REPLACE FUNCTION public.trg_recompute_job_from_voucher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.job_id IS NOT NULL THEN
      PERFORM public.recompute_job_totals(OLD.job_id);
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.job_id IS NOT NULL THEN
    PERFORM public.recompute_job_totals(NEW.job_id);
  END IF;
  IF TG_OP='UPDATE' AND OLD.job_id IS DISTINCT FROM NEW.job_id AND OLD.job_id IS NOT NULL THEN
    PERFORM public.recompute_job_totals(OLD.job_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_voucher_redemption_recompute ON public.voucher_redemptions;
CREATE TRIGGER trg_voucher_redemption_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.voucher_redemptions
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_job_from_voucher();

-- Backfill every job balance
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.jobs LOOP
    PERFORM public.recompute_job_totals(r.id);
  END LOOP;
END $$;

-- Public RPC the admin tools button calls
CREATE OR REPLACE FUNCTION public.recompute_all_job_balances()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; n int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  FOR r IN SELECT id FROM public.jobs LOOP
    PERFORM public.recompute_job_totals(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION public.recompute_all_job_balances() TO authenticated;

-- =====================================================
-- 2. BILL OCCURRENCES — paid_from + unique index
-- =====================================================

ALTER TABLE public.bill_occurrences
  ADD COLUMN IF NOT EXISTS paid_from text,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE UNIQUE INDEX IF NOT EXISTS bill_occurrences_bill_month_uniq
  ON public.bill_occurrences (bill_id, period_month);

-- =====================================================
-- 3. WORKERS — PIN login columns
-- =====================================================

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS login_pin_hash text,
  ADD COLUMN IF NOT EXISTS login_pin_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS login_last_at timestamptz,
  ADD COLUMN IF NOT EXISTS login_identifier text;

-- =====================================================
-- 4. WORKER INVITE LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.worker_invite_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  error text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.worker_invite_log TO authenticated;
GRANT ALL ON public.worker_invite_log TO service_role;

ALTER TABLE public.worker_invite_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read worker_invite_log" ON public.worker_invite_log;
CREATE POLICY "Admins read worker_invite_log"
ON public.worker_invite_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert worker_invite_log" ON public.worker_invite_log;
CREATE POLICY "Admins insert worker_invite_log"
ON public.worker_invite_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5. BUSINESS ASSIGNMENTS (mirror of personal_assignments)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.business_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid,
  target_type text NOT NULL,
  target_id uuid,
  category text,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'assigned',
  notes text,
  assigned_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_assignments TO authenticated;
GRANT ALL ON public.business_assignments TO service_role;

ALTER TABLE public.business_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage business_assignments" ON public.business_assignments;
CREATE POLICY "Admins manage business_assignments"
ON public.business_assignments FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_business_assignments_touch
BEFORE UPDATE ON public.business_assignments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- 6. LIVE CASH VIEWS
-- =====================================================

-- Business live cash = money still physically in business
CREATE OR REPLACE VIEW public.v_business_live_cash AS
WITH
  payments_in AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.job_payments),
  voucher_cash_in AS (SELECT COALESCE(SUM(amount_paid),0) AS amt FROM public.service_vouchers WHERE status NOT IN ('void','cancelled','refunded')),
  historical_in AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.historical_income WHERE count_in_cash = true AND already_spent = false AND (scope IS NULL OR scope = 'business')),
  materials_out AS (SELECT COALESCE(SUM(cost),0) AS amt FROM public.job_materials WHERE paid_by = 'me'),
  worker_pay_out AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.worker_payments),
  bills_out AS (
    SELECT COALESCE(SUM(o.paid_amount),0) AS amt
    FROM public.bill_occurrences o
    JOIN public.bills b ON b.id = o.bill_id
    WHERE o.paid = true AND b.bill_type = 'business' AND (o.paid_from IS NULL OR o.paid_from = 'business')
  ),
  debt_out AS (
    SELECT COALESCE(SUM(dp.amount),0) AS amt
    FROM public.debt_payments dp
    JOIN public.debts d ON d.id = dp.debt_id
    WHERE COALESCE(d.debt_scope, 'business') = 'business'
  ),
  transfers_out AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.owner_pay_transfers WHERE status NOT IN ('reversed','cancelled'))
SELECT
  (SELECT amt FROM payments_in)
  + (SELECT amt FROM voucher_cash_in)
  + (SELECT amt FROM historical_in)
  - (SELECT amt FROM materials_out)
  - (SELECT amt FROM worker_pay_out)
  - (SELECT amt FROM bills_out)
  - (SELECT amt FROM debt_out)
  - (SELECT amt FROM transfers_out)
  AS live_cash,
  (SELECT amt FROM payments_in) AS payments_in,
  (SELECT amt FROM voucher_cash_in) AS voucher_cash_in,
  (SELECT amt FROM historical_in) AS historical_in,
  (SELECT amt FROM materials_out) AS materials_out,
  (SELECT amt FROM worker_pay_out) AS worker_pay_out,
  (SELECT amt FROM bills_out) AS bills_out,
  (SELECT amt FROM debt_out) AS debt_out,
  (SELECT amt FROM transfers_out) AS transfers_out;

GRANT SELECT ON public.v_business_live_cash TO authenticated;

-- Business assigned (allocations not yet transferred/spent + business_assignments)
CREATE OR REPLACE VIEW public.v_business_assigned AS
WITH
  alloc AS (
    SELECT COALESCE(SUM(
      COALESCE(owner_pay_amount,0) + COALESCE(overhead_amount,0) + COALESCE(reserve_amount,0)
    ),0) AS amt
    FROM public.allocations
    WHERE COALESCE(status,'assigned') = 'assigned'
  ),
  buckets AS (
    SELECT COALESCE(SUM(amount),0) AS amt
    FROM public.business_assignments
    WHERE status = 'assigned'
  )
SELECT (SELECT amt FROM alloc) + (SELECT amt FROM buckets) AS assigned_total;

GRANT SELECT ON public.v_business_assigned TO authenticated;

-- Personal live cash
CREATE OR REPLACE VIEW public.v_personal_live_cash AS
WITH
  transfers_in AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.owner_pay_transfers WHERE status NOT IN ('reversed','cancelled')),
  personal_income_in AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.personal_expenses WHERE is_income = true),
  historical_personal_in AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.historical_income WHERE count_in_cash = true AND already_spent = false AND scope = 'personal'),
  personal_exp_out AS (SELECT COALESCE(SUM(amount),0) AS amt FROM public.personal_expenses WHERE is_income = false),
  bills_out AS (
    SELECT COALESCE(SUM(o.paid_amount),0) AS amt
    FROM public.bill_occurrences o
    JOIN public.bills b ON b.id = o.bill_id
    WHERE o.paid = true AND (b.bill_type = 'personal' OR o.paid_from = 'personal')
      AND NOT (b.bill_type = 'business' AND (o.paid_from IS NULL OR o.paid_from = 'business'))
  ),
  debt_out AS (
    SELECT COALESCE(SUM(dp.amount),0) AS amt
    FROM public.debt_payments dp
    JOIN public.debts d ON d.id = dp.debt_id
    WHERE COALESCE(d.debt_scope, 'business') = 'personal'
  )
SELECT
  (SELECT amt FROM transfers_in)
  + (SELECT amt FROM personal_income_in)
  + (SELECT amt FROM historical_personal_in)
  - (SELECT amt FROM personal_exp_out)
  - (SELECT amt FROM bills_out)
  - (SELECT amt FROM debt_out)
  AS live_cash,
  (SELECT amt FROM transfers_in) AS transfers_in,
  (SELECT amt FROM personal_income_in) AS personal_income_in,
  (SELECT amt FROM personal_exp_out) AS personal_exp_out,
  (SELECT amt FROM bills_out) AS bills_out,
  (SELECT amt FROM debt_out) AS debt_out;

GRANT SELECT ON public.v_personal_live_cash TO authenticated;

CREATE OR REPLACE VIEW public.v_personal_assigned AS
SELECT COALESCE(SUM(amount),0) AS assigned_total
FROM public.personal_assignments
WHERE status = 'assigned';

GRANT SELECT ON public.v_personal_assigned TO authenticated;

-- Voucher liability
CREATE OR REPLACE VIEW public.v_voucher_liability AS
SELECT COALESCE(SUM(GREATEST(COALESCE(credit_value,0) - COALESCE(credit_used,0), 0)),0) AS outstanding
FROM public.service_vouchers
WHERE status IN ('active','partial','partially_used');

GRANT SELECT ON public.v_voucher_liability TO authenticated;

-- =====================================================
-- 7. ALLOCATION / OWNER PAY TRANSFER guards
-- =====================================================

-- Make sure status defaults are sensible
ALTER TABLE public.allocations ALTER COLUMN status SET DEFAULT 'assigned';
ALTER TABLE public.owner_pay_transfers ALTER COLUMN status SET DEFAULT 'completed';
