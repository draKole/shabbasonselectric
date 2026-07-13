-- Create lead_stage enum for the 15-stage pipeline
CREATE TYPE public.lead_stage AS ENUM (
  'new_lead', 'contacted', 'site_visit_needed', 'estimate_needed',
  'estimate_sent', 'follow_up', 'approved', 'scheduled',
  'in_progress', 'waiting_on_customer', 'waiting_on_material',
  'completed', 'invoice_sent', 'paid', 'lost'
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  property_address TEXT,
  city TEXT,
  state TEXT DEFAULT 'OH',
  zip TEXT,
  lead_source TEXT DEFAULT 'Other',
  service_requested TEXT,
  job_description TEXT,
  estimated_value NUMERIC DEFAULT 0,
  status lead_stage DEFAULT 'new_lead',
  notes TEXT,
  next_follow_up DATE,
  last_contacted_at TIMESTAMPTZ,
  photos TEXT[],
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  converted_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins manage leads" ON public.leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can create a lead (online submission)
CREATE POLICY "Anyone can create lead" ON public.leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_follow_up ON public.leads(next_follow_up)
  WHERE next_follow_up IS NOT NULL;
CREATE INDEX idx_leads_customer ON public.leads(customer_id)
  WHERE customer_id IS NOT NULL;
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);

-- Auto-update trigger
CREATE TRIGGER leads_touch_updated BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();