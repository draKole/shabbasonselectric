-- Drop the anonymous INSERT policy on leads (replaced by Edge Function)
DROP POLICY IF EXISTS "Anyone can create lead" ON public.leads;

-- Audit log for all lead submission attempts (rate limiting + spam tracking)
CREATE TABLE public.lead_submission_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  turnstile_passed BOOLEAN NOT NULL DEFAULT false,
  accepted BOOLEAN NOT NULL DEFAULT false,
  reject_reason TEXT,
  payload_summary TEXT
);

-- Only service-role can access
ALTER TABLE public.lead_submission_log ENABLE ROW LEVEL SECURITY;

-- Index for rate-limiting queries
CREATE INDEX idx_submission_log_ip_time ON public.lead_submission_log(ip_address, submitted_at DESC);