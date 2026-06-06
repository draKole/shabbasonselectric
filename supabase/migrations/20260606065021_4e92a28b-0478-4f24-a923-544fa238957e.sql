DROP VIEW IF EXISTS public.v_allocation_available;
CREATE VIEW public.v_allocation_available WITH (security_invoker = on) AS
  SELECT * FROM public.allocations WHERE status IN ('unallocated','allocated');
GRANT SELECT ON public.v_allocation_available TO authenticated;
GRANT SELECT ON public.v_allocation_available TO service_role;