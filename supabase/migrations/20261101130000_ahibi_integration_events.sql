-- Replay protection and processing state for server-to-server AHIBI requests.
-- The table is private to the NUSC server's service-role client.
-- Already applied to production; preserve this source and do not rerun it.

BEGIN;

CREATE TABLE public.integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text NOT NULL,
  external_request_id text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error_code text,
  CONSTRAINT integration_events_provider_request_uidx
    UNIQUE (provider, external_request_id)
);

ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.integration_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.integration_events TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
