
-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TYPE public.customer_type AS ENUM ('homeowner', 'landlord', 'contractor', 'investor', 'business', 'new_construction', 'job_site');

CREATE TYPE public.job_type AS ENUM (
  'electrical_repair', 'troubleshooting', 'panel_upgrade', 'service_change',
  'lighting_installation', 'outlet_switch_gfci', 'dedicated_circuit',
  'ceiling_fan', 'security_camera', 'tv_outlet', 'remodel_wiring',
  'new_construction', 'inspection_permit_support', 'contractor_support', 'other'
);

CREATE TYPE public.job_status AS ENUM (
  'new_lead', 'contacted', 'estimate_scheduled', 'estimate_sent', 'approved',
  'down_payment_needed', 'materials_needed', 'scheduled', 'in_progress',
  'waiting_on_permit', 'waiting_on_inspection', 'ready_for_inspection',
  'inspection_passed', 'final_needed', 'completed', 'paid', 'review_requested',
  'archived', 'lost_lead'
);

CREATE TYPE public.urgency_level AS ENUM ('emergency', 'this_week', 'flexible', 'planning_ahead');

CREATE TYPE public.contact_method AS ENUM ('call', 'text', 'email');

CREATE TYPE public.permit_status AS ENUM ('yes', 'no', 'not_sure');

CREATE TYPE public.inspection_type AS ENUM ('rough', 'service', 'final', 'other');

CREATE TYPE public.inspection_status AS ENUM ('pending', 'passed', 'failed', 'not_applicable');

CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid');

CREATE TYPE public.calendar_event_type AS ENUM (
  'estimate', 'service_call', 'rough_in', 'trim_out', 'panel_upgrade',
  'service_change', 'inspection', 'material_pickup', 'follow_up', 'final_walkthrough', 'other'
);

CREATE TYPE public.review_platform AS ENUM ('google', 'nextdoor', 'facebook', 'other');

CREATE TYPE public.portfolio_category AS ENUM (
  'new_construction', 'panel_upgrades', 'service_changes', 'lighting',
  'outlets_gfci', 'troubleshooting', 'remodel_wiring', 'commercial',
  'contractor_support', 'inspection_ready'
);

CREATE TYPE public.photo_type AS ENUM ('customer_upload', 'before', 'after', 'receipt', 'other');

-- ============================================
-- USER ROLES (separate table for security)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TIMESTAMP TRIGGER HELPER
-- ============================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  preferred_contact contact_method DEFAULT 'call',
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'OH',
  zip TEXT,
  customer_type customer_type DEFAULT 'homeowner',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER customers_touch_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Anyone can submit a new lead (creates a customer)
CREATE POLICY "Anyone can create customer (lead submission)" ON public.customers
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- JOBS
-- ============================================
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  job_title TEXT,
  job_type job_type NOT NULL DEFAULT 'other',
  status job_status NOT NULL DEFAULT 'new_lead',
  urgency urgency_level DEFAULT 'flexible',
  priority INT DEFAULT 0,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'OH',
  zip TEXT,
  description TEXT,
  internal_notes TEXT,
  preferred_date DATE,
  preferred_time_window TEXT,
  alternate_date DATE,
  alternate_time_window TEXT,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  estimate_amount NUMERIC(10,2) DEFAULT 0,
  deposit_required NUMERIC(10,2) DEFAULT 0,
  deposit_paid NUMERIC(10,2) DEFAULT 0,
  materials_cost NUMERIC(10,2) DEFAULT 0,
  labor_amount NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) DEFAULT 0,
  payment_status payment_status DEFAULT 'unpaid',
  payment_notes TEXT,
  permit_needed permit_status DEFAULT 'not_sure',
  permit_number TEXT,
  permit_pulled_by TEXT,
  inspection_needed permit_status DEFAULT 'not_sure',
  inspection_type inspection_type,
  inspection_date DATE,
  inspection_status inspection_status DEFAULT 'not_applicable',
  inspection_notes TEXT,
  corrections_needed TEXT,
  materials_needed TEXT,
  power_status TEXT,
  has_existing_estimate BOOLEAN DEFAULT FALSE,
  wants_free_estimate BOOLEAN DEFAULT TRUE,
  wants_ballpark BOOLEAN DEFAULT FALSE,
  has_materials TEXT,
  last_contact TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER jobs_touch_updated BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_jobs_customer ON public.jobs(customer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_scheduled_start ON public.jobs(scheduled_start);

-- Anyone can create a job (lead submission)
CREATE POLICY "Anyone can create job (lead submission)" ON public.jobs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete jobs" ON public.jobs
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- JOB PHOTOS
-- ============================================
CREATE TABLE public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type photo_type DEFAULT 'customer_upload',
  caption TEXT,
  uploaded_by_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_job_photos_job ON public.job_photos(job_id);

CREATE POLICY "Anyone can upload customer photos" ON public.job_photos
  FOR INSERT TO anon, authenticated
  WITH CHECK (uploaded_by_admin = FALSE);

CREATE POLICY "Admins can manage all photos" ON public.job_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ESTIMATES
-- ============================================
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  scope TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  materials_included BOOLEAN DEFAULT TRUE,
  labor_price NUMERIC(10,2) DEFAULT 0,
  material_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  deposit_required NUMERIC(10,2) DEFAULT 0,
  terms TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER estimates_touch_updated BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Admins manage estimates" ON public.estimates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  neighborhood TEXT,
  service_type TEXT,
  platform review_platform DEFAULT 'google',
  rating INT CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_requested BOOLEAN DEFAULT FALSE,
  requested_at TIMESTAMPTZ,
  review_received BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ,
  public_visible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER reviews_touch_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Public can view visible reviews" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (public_visible = TRUE);

CREATE POLICY "Admins manage reviews" ON public.reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- CALENDAR EVENTS
-- ============================================
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  description TEXT,
  event_type calendar_event_type DEFAULT 'service_call',
  calendar_status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER calendar_events_touch_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_calendar_events_start ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_job ON public.calendar_events(job_id);

CREATE POLICY "Admins manage calendar" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- REMINDERS
-- ============================================
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reminders" ON public.reminders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PORTFOLIO PROJECTS
-- ============================================
CREATE TABLE public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  review_id UUID REFERENCES public.reviews(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category portfolio_category NOT NULL,
  description TEXT,
  city TEXT,
  neighborhood TEXT,
  cover_image TEXT,
  before_photos JSONB DEFAULT '[]'::jsonb,
  after_photos JSONB DEFAULT '[]'::jsonb,
  services_performed TEXT,
  permit_inspection_involved BOOLEAN DEFAULT FALSE,
  show_price BOOLEAN DEFAULT FALSE,
  price_displayed NUMERIC(10,2),
  public_visible BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER portfolio_touch_updated BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Public views visible portfolio" ON public.portfolio_projects
  FOR SELECT TO anon, authenticated
  USING (public_visible = TRUE);

CREATE POLICY "Admins manage portfolio" ON public.portfolio_projects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- JOB TIMELINE EVENTS (auto-logged status changes)
-- ============================================
CREATE TABLE public.job_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  from_status job_status,
  to_status job_status,
  note TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_timeline_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_timeline_job ON public.job_timeline_events(job_id, created_at DESC);

CREATE POLICY "Admins view timeline" ON public.job_timeline_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System inserts timeline" ON public.job_timeline_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Trigger: log status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.job_timeline_events(job_id, event_type, to_status, note, actor_id)
    VALUES (NEW.id, 'created', NEW.status, 'Job created', auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.job_timeline_events(job_id, event_type, from_status, to_status, note, actor_id)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, NULL, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_log_status_change
AFTER INSERT OR UPDATE OF status ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-uploads', 'customer-uploads', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: customer-uploads (anyone can upload, anyone can read)
CREATE POLICY "Anyone can upload customer photos to bucket"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'customer-uploads');

CREATE POLICY "Anyone can read customer photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'customer-uploads');

CREATE POLICY "Admins manage customer photos"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'customer-uploads' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'customer-uploads' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: job-photos (admin write, public read for portfolio use)
CREATE POLICY "Anyone can read job photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'job-photos');

CREATE POLICY "Admins upload job photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update job photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete job photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-photos' AND public.has_role(auth.uid(), 'admin'));
