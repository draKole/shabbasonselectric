
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS tax_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS workers_comp_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppe_monthly numeric NOT NULL DEFAULT 0;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS converted_worker_id uuid;
