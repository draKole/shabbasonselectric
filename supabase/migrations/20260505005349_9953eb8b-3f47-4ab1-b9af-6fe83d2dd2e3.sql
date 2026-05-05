
-- 1) App settings (single row keyed by key)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.app_settings(key,value) VALUES ('google_review_url','') ON CONFLICT DO NOTHING;

-- 2) Reviews: featured flag
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;

-- 3) Jobs: review requested flag
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_requested boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS review_requested_at timestamptz;

-- 4) Job applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  has_experience boolean DEFAULT false,
  years_experience numeric DEFAULT 0,
  skills text[],
  has_tools boolean DEFAULT false,
  has_transport boolean DEFAULT false,
  is_licensed boolean DEFAULT false,
  follows_code boolean DEFAULT false,
  availability text,
  desired_pay text,
  notes text,
  photo_urls text[],
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can apply" ON public.job_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins view applications" ON public.job_applications FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update applications" ON public.job_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete applications" ON public.job_applications FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_job_applications_updated BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
