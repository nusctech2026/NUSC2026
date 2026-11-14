BEGIN;

-- Keep retry receipts separate from attendance facts. The receipt stores only
-- a request fingerprint and a candidate-free response; the existing
-- attendance RPC remains the authority for every decision and state change.
CREATE TABLE IF NOT EXISTS public.campaign_scan_idempotency (
  operation_id UUID PRIMARY KEY,
  scanner_user_id UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT campaign_scan_idempotency_fingerprint_check
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$')
);

-- Offline queue entries do not expire, so there is no safe age-based receipt
-- cleanup: deleting a receipt could let a delayed retry execute attendance
-- again. Retain receipts indefinitely; introduce cleanup only with a durable
-- upper bound on client retry age or an equivalent archival/idempotency guard.
COMMENT ON TABLE public.campaign_scan_idempotency IS
  'Retained indefinitely. No automatic cleanup is safe while offline client operations have no expiry.';

ALTER TABLE public.campaign_scan_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.campaign_scan_idempotency FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_campaign_attendance_scan_idempotent(
  p_operation_id UUID,
  p_scanner_user_id UUID,
  p_qr_token TEXT,
  p_scan_credential TEXT,
  p_action TEXT,
  p_checkpoint_type TEXT,
  p_checkpoint TEXT,
  p_event_id UUID,
  p_scanned_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_request JSONB;
  v_fingerprint TEXT;
  v_inserted INTEGER;
  v_existing public.campaign_scan_idempotency%ROWTYPE;
  v_result JSONB;
  v_receipt JSONB;
BEGIN
  IF p_operation_id IS NULL OR p_scanner_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'INVALID_OPERATION',
      'message', 'A scanner operation and authenticated staff identity are required'
    );
  END IF;

  v_request := jsonb_build_object(
    'scan_credential', lower(trim(p_scan_credential)),
    'action', p_action,
    'checkpoint_type', p_checkpoint_type,
    'checkpoint', trim(p_checkpoint),
    'event_id', p_event_id
  );
  v_fingerprint := encode(
    extensions.digest(convert_to(v_request::TEXT, 'UTF8'), 'sha256'),
    'hex'
  );

  -- The primary-key conflict waits for an in-flight request with the same
  -- operation ID. Only the transaction that inserts the receipt calls the
  -- attendance RPC; concurrent retries return its committed response.
  INSERT INTO public.campaign_scan_idempotency (
    operation_id, scanner_user_id, request_fingerprint
  ) VALUES (
    p_operation_id, p_scanner_user_id, v_fingerprint
  ) ON CONFLICT (operation_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT * INTO v_existing
    FROM public.campaign_scan_idempotency
    WHERE operation_id = p_operation_id
    FOR UPDATE;

    IF NOT FOUND
       OR v_existing.scanner_user_id <> p_scanner_user_id
       OR v_existing.request_fingerprint <> v_fingerprint THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'IDEMPOTENCY_CONFLICT',
        'message', 'This operation ID was already used for a different scan'
      );
    END IF;

    IF v_existing.response IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'code', 'RETRY_PENDING',
        'message', 'The original scan is still being processed'
      );
    END IF;

    RETURN v_existing.response || jsonb_build_object('idempotent_replay', true);
  END IF;

  v_result := public.record_campaign_attendance_scan(
    p_qr_token,
    p_action,
    p_checkpoint_type,
    p_checkpoint,
    p_event_id,
    p_scanned_by
  );

  -- Candidate information is returned to the first caller but is not copied
  -- into the retry table. A replay can safely confirm its prior outcome; the
  -- scanner already has its locally encrypted candidate snapshot.
  v_receipt := (v_result - 'candidate') || jsonb_build_object('idempotent_replay', false);
  UPDATE public.campaign_scan_idempotency
  SET response = v_receipt
  WHERE operation_id = p_operation_id;

  RETURN v_result || jsonb_build_object('idempotent_replay', false);
END;
$$;

REVOKE ALL ON FUNCTION public.record_campaign_attendance_scan_idempotent(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_campaign_attendance_scan_idempotent(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT
) TO service_role;

COMMIT;
