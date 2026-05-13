-- Paystubs
CREATE TABLE public.paystubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL DEFAULT CURRENT_DATE,
  hours numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  gross numeric NOT NULL DEFAULT 0,
  fed_wh numeric NOT NULL DEFAULT 0,
  state_wh numeric NOT NULL DEFAULT 0,
  local_wh numeric NOT NULL DEFAULT 0,
  fica_ee numeric NOT NULL DEFAULT 0,
  fica_er numeric NOT NULL DEFAULT 0,
  retirement numeric NOT NULL DEFAULT 0,
  wc_amt numeric NOT NULL DEFAULT 0,
  ins_amt numeric NOT NULL DEFAULT 0,
  ppe_amt numeric NOT NULL DEFAULT 0,
  deductions_total numeric NOT NULL DEFAULT 0,
  net_pay numeric NOT NULL DEFAULT 0,
  employer_total_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.paystubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage paystubs" ON public.paystubs FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Worker reads own paystubs" ON public.paystubs FOR SELECT TO authenticated
  USING (worker_id = my_worker_id());
CREATE TRIGGER touch_paystubs BEFORE UPDATE ON public.paystubs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Historical income
CREATE TABLE public.historical_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_name text,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  scope text NOT NULL DEFAULT 'business',
  source text NOT NULL DEFAULT 'manual_import',
  already_spent boolean NOT NULL DEFAULT false,
  count_in_ytd boolean NOT NULL DEFAULT true,
  count_in_cash boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.historical_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage historical_income" ON public.historical_income FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER touch_hist_inc BEFORE UPDATE ON public.historical_income FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Worker documents checklist
CREATE TABLE public.worker_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL,
  doc_key text NOT NULL,
  received boolean NOT NULL DEFAULT false,
  received_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(worker_id, doc_key)
);
ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage worker_documents" ON public.worker_documents FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Worker reads own documents" ON public.worker_documents FOR SELECT TO authenticated
  USING (worker_id = my_worker_id());
CREATE TRIGGER touch_worker_docs BEFORE UPDATE ON public.worker_documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Extend worker_time_entries
ALTER TABLE public.worker_time_entries
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS paystub_id uuid,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;