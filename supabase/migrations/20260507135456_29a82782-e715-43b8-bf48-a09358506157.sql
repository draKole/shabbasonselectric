-- Job tasks/checklists
CREATE TABLE IF NOT EXISTS public.job_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  worker_id uuid,
  title text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'not_started',
  due_date date,
  display_order int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage job_tasks" ON public.job_tasks FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_job_tasks_job ON public.job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_due ON public.job_tasks(due_date) WHERE status <> 'done';
CREATE TRIGGER trg_job_tasks_touch BEFORE UPDATE ON public.job_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Public share token for estimates
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS share_token uuid UNIQUE DEFAULT gen_random_uuid();
UPDATE public.estimates SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Allow public read of an estimate when accessed by token (via RPC or anon select with token filter).
-- We expose a security-definer function that returns one estimate by token, plus job/customer minimal info.
CREATE OR REPLACE FUNCTION public.get_estimate_by_token(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  SELECT to_jsonb(e) || jsonb_build_object(
    'job', to_jsonb(j) - 'internal_notes',
    'customer', jsonb_build_object('name', c.name, 'phone', c.phone, 'address', c.address, 'city', c.city, 'state', c.state)
  )
  INTO result
  FROM public.estimates e
  LEFT JOIN public.jobs j ON j.id = e.job_id
  LEFT JOIN public.customers c ON c.id = j.customer_id
  WHERE e.share_token = _token
  LIMIT 1;
  RETURN result;
END $$;
GRANT EXECUTE ON FUNCTION public.get_estimate_by_token(uuid) TO anon, authenticated;