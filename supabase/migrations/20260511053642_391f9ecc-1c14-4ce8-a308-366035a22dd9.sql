
-- Workers: owner + portal + onboarding fields
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS is_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pay_schedule text NOT NULL DEFAULT 'weekly',
  ADD COLUMN IF NOT EXISTS pay_day text NOT NULL DEFAULT 'friday',
  ADD COLUMN IF NOT EXISTS pay_mode text NOT NULL DEFAULT 'hourly',
  ADD COLUMN IF NOT EXISTS worker_type text NOT NULL DEFAULT 'helper',
  ADD COLUMN IF NOT EXISTS onboarding jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'none';

CREATE UNIQUE INDEX IF NOT EXISTS workers_auth_user_id_uidx
  ON public.workers(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Time entries: approval + paid tracking
ALTER TABLE public.worker_time_entries
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Helper: is this auth user the worker linked to a job (via tasks or time entries)?
CREATE OR REPLACE FUNCTION public.is_worker_for_job(_uid uuid, _job_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workers w
    WHERE w.auth_user_id = _uid AND (
      EXISTS (SELECT 1 FROM public.job_tasks t WHERE t.job_id = _job_id AND t.worker_id = w.id)
      OR EXISTS (SELECT 1 FROM public.worker_time_entries e WHERE e.job_id = _job_id AND e.worker_id = w.id)
    )
  )
$$;

-- Helper: get my worker_id from auth uid
CREATE OR REPLACE FUNCTION public.my_worker_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.workers WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Workers: a worker can read their own row
DROP POLICY IF EXISTS "Worker reads own row" ON public.workers;
CREATE POLICY "Worker reads own row" ON public.workers
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Jobs: a worker can read jobs they're assigned to
DROP POLICY IF EXISTS "Worker reads assigned jobs" ON public.jobs;
CREATE POLICY "Worker reads assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.is_worker_for_job(auth.uid(), id));

-- Job tasks: worker reads & updates own
DROP POLICY IF EXISTS "Worker reads own tasks" ON public.job_tasks;
CREATE POLICY "Worker reads own tasks" ON public.job_tasks
  FOR SELECT TO authenticated
  USING (worker_id = public.my_worker_id());

DROP POLICY IF EXISTS "Worker updates own tasks" ON public.job_tasks;
CREATE POLICY "Worker updates own tasks" ON public.job_tasks
  FOR UPDATE TO authenticated
  USING (worker_id = public.my_worker_id())
  WITH CHECK (worker_id = public.my_worker_id());

-- Worker time entries: worker reads, inserts, updates, deletes their own (unpaid only for delete/update)
DROP POLICY IF EXISTS "Worker reads own time" ON public.worker_time_entries;
CREATE POLICY "Worker reads own time" ON public.worker_time_entries
  FOR SELECT TO authenticated
  USING (worker_id = public.my_worker_id());

DROP POLICY IF EXISTS "Worker inserts own time" ON public.worker_time_entries;
CREATE POLICY "Worker inserts own time" ON public.worker_time_entries
  FOR INSERT TO authenticated
  WITH CHECK (worker_id = public.my_worker_id() AND approved = false AND paid = false);

DROP POLICY IF EXISTS "Worker updates own pending time" ON public.worker_time_entries;
CREATE POLICY "Worker updates own pending time" ON public.worker_time_entries
  FOR UPDATE TO authenticated
  USING (worker_id = public.my_worker_id() AND approved = false AND paid = false)
  WITH CHECK (worker_id = public.my_worker_id() AND approved = false AND paid = false);

DROP POLICY IF EXISTS "Worker deletes own pending time" ON public.worker_time_entries;
CREATE POLICY "Worker deletes own pending time" ON public.worker_time_entries
  FOR DELETE TO authenticated
  USING (worker_id = public.my_worker_id() AND approved = false AND paid = false);

-- Job photos: worker uploads to assigned jobs
DROP POLICY IF EXISTS "Worker uploads photos to assigned jobs" ON public.job_photos;
CREATE POLICY "Worker uploads photos to assigned jobs" ON public.job_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_worker_for_job(auth.uid(), job_id));

DROP POLICY IF EXISTS "Worker reads photos on assigned jobs" ON public.job_photos;
CREATE POLICY "Worker reads photos on assigned jobs" ON public.job_photos
  FOR SELECT TO authenticated
  USING (public.is_worker_for_job(auth.uid(), job_id));
