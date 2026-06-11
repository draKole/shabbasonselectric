
ALTER VIEW public.v_business_live_cash SET (security_invoker = true);
ALTER VIEW public.v_business_assigned SET (security_invoker = true);
ALTER VIEW public.v_personal_live_cash SET (security_invoker = true);
ALTER VIEW public.v_personal_assigned SET (security_invoker = true);
ALTER VIEW public.v_voucher_liability SET (security_invoker = true);
