
-- 1. app_settings: restrict public read to safe keys only
DROP POLICY IF EXISTS "Public can read settings" ON public.app_settings;
CREATE POLICY "Public can read whitelisted settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (key IN (
    'google_review_url',
    'business_name', 'business_phone', 'business_address',
    'estimate_show_original', 'estimate_show_discount', 'estimate_show_final',
    'estimate_show_materials_note', 'estimate_valid_days', 'estimate_discount_label',
    'voucher_default_terms', 'voucher_min_schedule_days',
    'review_request_text', 'savings_policy_text'
  ));

-- 2. job_timeline_events: remove WITH CHECK (true); only admins can insert directly.
-- The log_job_status_change trigger is SECURITY DEFINER and bypasses RLS.
DROP POLICY IF EXISTS "System inserts timeline" ON public.job_timeline_events;
CREATE POLICY "Admins insert timeline"
  ON public.job_timeline_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. job_photos: tighten anonymous customer-upload path to require valid job
DROP POLICY IF EXISTS "Anyone can upload customer photos" ON public.job_photos;
CREATE POLICY "Customers upload photos to existing jobs"
  ON public.job_photos FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    uploaded_by_admin = false
    AND job_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id)
  );

-- 4. Storage: remove broad anonymous listing on job-photos bucket
DROP POLICY IF EXISTS "Anyone can read job photos" ON storage.objects;
-- Files in this public bucket can still be fetched by direct URL (needed for the portfolio
-- gallery), but the bucket can no longer be enumerated via the storage API.

-- 5. Revoke EXECUTE on internal trigger / recompute functions from anon + authenticated.
-- has_role / is_worker_for_job / my_worker_id / claim_first_admin / get_estimate_by_token
-- intentionally remain executable because they back RLS and public flows.
REVOKE EXECUTE ON FUNCTION public.trg_job_total_changed() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_job_totals() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_debt() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recompute_worker_labor() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_job_status_change() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_job_totals(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_debt_balance(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recompute_job_worker_labor(uuid) FROM anon, authenticated, PUBLIC;
