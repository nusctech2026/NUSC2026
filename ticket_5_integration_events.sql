CREATE TABLE IF NOT EXISTS public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_request_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  error_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE(provider, external_request_id)
);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

-- Deny all access to anon and authenticated users
CREATE POLICY "Deny all access to anon on integration_events" ON public.integration_events FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny all access to authenticated on integration_events" ON public.integration_events FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Only service_role can access (which bypasses RLS anyway, but we are explicit that no user policies exist for it)
