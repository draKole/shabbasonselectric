
ALTER TABLE public.historical_income
  ADD COLUMN IF NOT EXISTS est_materials_pct numeric NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS est_materials_amount numeric;
