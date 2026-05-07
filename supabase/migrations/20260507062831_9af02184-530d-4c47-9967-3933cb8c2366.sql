-- PHASE 2: Contacts (uses customers via phone), Custom estimate templates, Workers/Payroll

-- 1) Estimate templates
CREATE TABLE public.estimate_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE,
  label text NOT NULL,
  scope text NOT NULL DEFAULT '',
  total numeric NOT NULL DEFAULT 0,
  deposit numeric NOT NULL DEFAULT 0,
  materials text NOT NULL DEFAULT 'Included',
  display_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estimate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage estimate_templates" ON public.estimate_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_estimate_templates_updated BEFORE UPDATE ON public.estimate_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed defaults
INSERT INTO public.estimate_templates (slug, label, scope, total, deposit, materials, display_order) VALUES
  ('service_call','Service Call / Diagnostic','Diagnose electrical issue\nTest circuits and breakers\nProvide written findings and quote',125,0,'Included',1),
  ('outlet_replace','Outlet Replacement (1)','Remove old outlet\nInstall new tamper-resistant outlet\nTest and verify',175,0,'Included',2),
  ('gfci_install','GFCI Outlet Install','Install code-compliant GFCI outlet\nTest trip function\nLabel as required',225,0,'Included',3),
  ('ceiling_fan','Ceiling Fan Install','Mount fan-rated box if needed\nAssemble and hang ceiling fan\nWire switch and test operation',285,0,'Provided by customer (fan)',4),
  ('panel_swap_200','200A Panel Swap','Coordinate power shutoff\nRemove existing panel\nInstall new 200A main breaker panel\nLabel circuits and test\nPermit + inspection coordination',2800,1000,'Included',5),
  ('ev_charger','EV Charger 240V Circuit','Run dedicated 240V circuit (up to 50ft)\nInstall 50A breaker\nMount and connect customer-supplied charger\nTest operation',950,300,'Included (wire/breaker); EVSE by customer',6),
  ('whole_home_surge','Whole-Home Surge Protector','Install whole-home surge protector at main panel\nVerify proper grounding\nTest and label',425,0,'Included',7),
  ('troubleshoot_hour','Troubleshoot (per hour)','Hourly troubleshooting and repair\nMinimum 1 hour\nMaterials billed separately',125,0,'Billed separately',8);

-- 2) Workers
CREATE TABLE public.workers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  email text,
  role text NOT NULL DEFAULT 'helper',
  pay_type text NOT NULL DEFAULT 'hourly', -- hourly | per_job | salary
  hourly_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage workers" ON public.workers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_workers_updated BEFORE UPDATE ON public.workers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Worker time entries
CREATE TABLE public.worker_time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL,
  job_id uuid,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0, -- hours*rate or fixed
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage worker_time_entries" ON public.worker_time_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 4) Worker payments (paid out to worker)
CREATE TABLE public.worker_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'cash',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage worker_payments" ON public.worker_payments FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 5) Recompute job worker_labor_cost from time entries
CREATE OR REPLACE FUNCTION public.recompute_job_worker_labor(_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sum numeric := 0;
BEGIN
  IF _job_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_sum FROM public.worker_time_entries WHERE job_id = _job_id;
  UPDATE public.jobs SET worker_labor_cost = v_sum, updated_at = now() WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_worker_labor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_job_worker_labor(COALESCE(NEW.job_id, OLD.job_id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_wte_recompute
AFTER INSERT OR UPDATE OR DELETE ON public.worker_time_entries
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_worker_labor();