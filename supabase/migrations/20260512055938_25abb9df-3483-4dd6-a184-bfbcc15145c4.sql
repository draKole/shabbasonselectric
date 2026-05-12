
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS bill_type text NOT NULL DEFAULT 'business';
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS debt_scope text NOT NULL DEFAULT 'personal';
ALTER TABLE public.allocation_presets ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'business';

UPDATE public.bills SET bill_type = 'business' WHERE bill_type IS NULL;
UPDATE public.debts SET debt_scope = 'personal' WHERE debt_scope IS NULL;

INSERT INTO public.app_settings (key, value) VALUES
  ('default_billing_rate', '125'),
  ('default_helper_rate', '20'),
  ('default_experienced_helper_rate', '27'),
  ('business_tax_reserve_pct', '25'),
  ('personal_tax_reserve_pct', '15')
ON CONFLICT (key) DO NOTHING;

-- Seed Business allocation preset if none exist for that scope
INSERT INTO public.allocation_presets (name, buckets, is_active, scope)
SELECT 'Business Default',
  '[
    {"name":"Business Taxes","percent":25,"color":"destructive","enabled":true},
    {"name":"Business Emergency Fund","percent":15,"color":"secondary","enabled":true},
    {"name":"Tools & Equipment","percent":10,"color":"accent","enabled":true},
    {"name":"Marketing","percent":10,"color":"primary","enabled":true},
    {"name":"Insurance & Compliance","percent":10,"color":"muted","enabled":true},
    {"name":"Future Payroll","percent":15,"color":"success","enabled":true},
    {"name":"Business Savings","percent":15,"color":"primary","enabled":true}
  ]'::jsonb,
  true, 'business'
WHERE NOT EXISTS (SELECT 1 FROM public.allocation_presets WHERE scope = 'business');

-- Seed Personal allocation preset if none exist for that scope
INSERT INTO public.allocation_presets (name, buckets, is_active, scope)
SELECT 'Personal Default',
  '[
    {"name":"Emergency Debt Payoff","percent":25,"color":"destructive","enabled":true},
    {"name":"Personal Bills","percent":25,"color":"secondary","enabled":true},
    {"name":"Personal Emergency Fund","percent":10,"color":"accent","enabled":true},
    {"name":"Personal Savings","percent":10,"color":"primary","enabled":true},
    {"name":"Investing","percent":10,"color":"success","enabled":true},
    {"name":"Son / Family","percent":10,"color":"muted","enabled":true},
    {"name":"Fun / Spending","percent":10,"color":"primary","enabled":true}
  ]'::jsonb,
  true, 'personal'
WHERE NOT EXISTS (SELECT 1 FROM public.allocation_presets WHERE scope = 'personal');
