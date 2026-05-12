
CREATE TABLE public.personal_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'other',
  method text NOT NULL DEFAULT 'cash',
  notes text,
  recurring boolean NOT NULL DEFAULT false,
  related_bill_id uuid,
  is_income boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage personal_expenses"
ON public.personal_expenses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER personal_expenses_touch
BEFORE UPDATE ON public.personal_expenses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_personal_expenses_date ON public.personal_expenses(expense_date);
