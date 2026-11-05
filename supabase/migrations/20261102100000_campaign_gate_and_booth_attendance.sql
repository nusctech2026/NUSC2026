-- Keep one credential per approved application while recording separate,
-- auditable gate and booth attendance sessions for each match.

ALTER TABLE public.campaign_attendance
  ADD COLUMN IF NOT EXISTS checkpoint_type TEXT NOT NULL DEFAULT 'gate',
  ADD COLUMN IF NOT EXISTS session_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_attendance_checkpoint_type_check'
      AND conrelid = 'public.campaign_attendance'::regclass
  ) THEN
    ALTER TABLE public.campaign_attendance
      ADD CONSTRAINT campaign_attendance_checkpoint_type_check
      CHECK (checkpoint_type IN ('gate', 'booth')) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.campaign_attendance
  VALIDATE CONSTRAINT campaign_attendance_checkpoint_type_check;

-- Existing scans remain gate scans. Use each historical check-in row as its
-- own session key so later exits can be paired without rewriting the audit log.
UPDATE public.campaign_attendance
SET session_id = id
WHERE action = 'check_in' AND session_id IS NULL AND event_id IS NOT NULL;

DROP INDEX IF EXISTS public.campaign_attendance_one_checkin_per_match;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_attendance_one_gate_checkin_per_match
  ON public.campaign_attendance(campaign_id, event_id)
  WHERE action = 'check_in' AND checkpoint_type = 'gate' AND event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_attendance_one_session_start
  ON public.campaign_attendance(session_id)
  WHERE action = 'check_in' AND session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_attendance_one_checkout_per_session
  ON public.campaign_attendance(session_id)
  WHERE action = 'check_out' AND session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS campaign_attendance_session_lookup
  ON public.campaign_attendance(campaign_id, event_id, checkpoint_type, lower(gate), action, scanned_at DESC);

CREATE OR REPLACE FUNCTION public.record_campaign_attendance_scan(
  p_qr_token TEXT,
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
  v_id public.campaign_ids%ROWTYPE;
  v_app public.campaign_applications%ROWTYPE;
  v_event public.campaign_events%ROWTYPE;
  v_session public.campaign_attendance%ROWTYPE;
  v_closed_session public.campaign_attendance%ROWTYPE;
  v_session_id UUID;
  v_application_id UUID;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_checkpoint TEXT := NULLIF(trim(p_checkpoint), '');
  v_role TEXT;
  v_candidate JSONB;
BEGIN
  IF p_action IS NULL OR p_action NOT IN ('check_in', 'check_out') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_ACTION', 'message', 'Choose check-in or check-out');
  END IF;
  IF p_checkpoint_type IS NULL OR p_checkpoint_type NOT IN ('gate', 'booth') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_CHECKPOINT', 'message', 'Choose a gate or booth');
  END IF;
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'MATCH_REQUIRED', 'message', 'Select a match before scanning');
  END IF;
  IF p_qr_token IS NULL OR p_qr_token !~ '^[0-9A-Fa-f]{64}$' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential not recognised');
  END IF;
  IF v_checkpoint IS NULL OR length(v_checkpoint) > 100
     OR (p_checkpoint_type = 'gate' AND v_checkpoint NOT IN ('Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'))
     OR (p_checkpoint_type = 'booth' AND length(v_checkpoint) < 2) THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_CHECKPOINT', 'message', 'Enter a valid gate or booth name');
  END IF;
  IF p_scanned_by IS NULL OR length(trim(p_scanned_by)) NOT BETWEEN 1 AND 255 THEN
    RETURN jsonb_build_object('success', false, 'code', 'STAFF_REQUIRED', 'message', 'Authenticated staff identity is required');
  END IF;

  SELECT * INTO v_event
  FROM public.campaign_events
  WHERE id = p_event_id
  FOR SHARE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MATCH', 'message', 'This match is unavailable');
  END IF;

  SELECT application_id INTO v_application_id
  FROM public.campaign_ids
  WHERE qr_token = p_qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential not recognised');
  END IF;

  -- Lock in the same application-then-credential order used by approval and
  -- replacement. Concurrent scans for this credential therefore serialize.
  SELECT * INTO v_app
  FROM public.campaign_applications
  WHERE id = v_application_id
  FOR UPDATE;

  SELECT * INTO v_id
  FROM public.campaign_ids
  WHERE qr_token = p_qr_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential has been replaced');
  END IF;

  v_now := clock_timestamp();

  IF p_action = 'check_in' THEN
    IF NOT v_event.is_active THEN
      RETURN jsonb_build_object('success', false, 'code', 'INVALID_MATCH', 'message', 'This match is unavailable for check-in');
    END IF;
    IF NOT v_id.is_active OR v_id.revoked_at IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'code', 'REVOKED', 'message', 'This credential has been revoked');
    END IF;
    IF v_now < v_id.valid_from THEN
      RETURN jsonb_build_object('success', false, 'code', 'NOT_YET_VALID', 'message', 'This credential is not yet valid');
    END IF;
    IF v_now > v_id.valid_until THEN
      RETURN jsonb_build_object('success', false, 'code', 'EXPIRED', 'message', 'This credential has expired');
    END IF;
    IF v_app.application_status <> 'approved' THEN
      RETURN jsonb_build_object('success', false, 'code', 'NOT_APPROVED', 'message', 'Candidate is not approved');
    END IF;
    IF v_app.event_id IS NOT NULL AND v_app.event_id <> p_event_id THEN
      RETURN jsonb_build_object('success', false, 'code', 'WRONG_MATCH', 'message', 'This credential is assigned to another match');
    END IF;
    IF v_now < v_event.start_date OR v_now > v_event.end_date THEN
      RETURN jsonb_build_object('success', false, 'code', 'MATCH_CLOSED', 'message', 'Check-in is closed for this match');
    END IF;
    SELECT CASE WHEN role.code IN ('ahibi_others', 'volunteer_others', 'crew_others', 'official_others', 'medical_others')
        THEN COALESCE('Others: ' || v_app.other_role, role.name) ELSE role.name END
      INTO v_role
    FROM public.campaign_roles AS role
    WHERE role.id = v_app.assigned_role_id
      AND role.category = v_app.category
      AND role.is_active;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'code', 'ROLE_REQUIRED', 'message', 'Candidate has no active assigned role');
    END IF;
  ELSE
    -- An exit can close an existing session after an event or credential is
    -- closed. This cannot admit someone: a matching, unclosed check-in is required.
    SELECT CASE WHEN role.code IN ('ahibi_others', 'volunteer_others', 'crew_others', 'official_others', 'medical_others')
        THEN COALESCE('Others: ' || v_app.other_role, role.name) ELSE role.name END INTO v_role
    FROM public.campaign_roles AS role
    WHERE role.id = v_app.assigned_role_id;
    IF v_role IS NULL THEN v_role := 'Assigned Personnel'; END IF;
  END IF;

  v_candidate := jsonb_build_object(
    'id_number', v_id.id_number,
    'full_name', v_app.full_name,
    'photo_storage_path', v_app.photo_storage_path,
    'category', v_app.category,
    'assigned_role', v_role,
    'assigned_zone', v_app.assigned_zone,
    'assigned_shift', v_app.assigned_shift
  );

  IF p_action = 'check_in' THEN
    IF p_checkpoint_type = 'gate' THEN
      SELECT * INTO v_session
      FROM public.campaign_attendance
      WHERE campaign_id = v_id.id
        AND event_id = p_event_id
        AND checkpoint_type = 'gate'
        AND action = 'check_in'
      ORDER BY scanned_at ASC
      LIMIT 1;
    ELSE
      SELECT entry.* INTO v_session
      FROM public.campaign_attendance AS entry
      WHERE entry.campaign_id = v_id.id
        AND entry.event_id = p_event_id
        AND entry.checkpoint_type = 'booth'
        AND lower(entry.gate) = lower(v_checkpoint)
        AND entry.action = 'check_in'
        AND NOT EXISTS (
          SELECT 1 FROM public.campaign_attendance AS out_scan
          WHERE out_scan.session_id = entry.session_id AND out_scan.action = 'check_out'
        )
      ORDER BY entry.scanned_at DESC
      LIMIT 1;
    END IF;

    IF FOUND THEN
      INSERT INTO public.campaign_attendance(
        event_id, application_id, campaign_id, checkpoint_type, session_id,
        action, gate, scanned_by, scanned_at, notes
      ) VALUES (
        p_event_id, v_app.id, v_id.id, p_checkpoint_type, v_session.session_id,
        'duplicate_attempt', v_checkpoint, p_scanned_by, v_now,
        CASE WHEN p_checkpoint_type = 'gate' THEN 'Already checked in to this match'
          ELSE 'Already checked in at this booth' END
      );
      RETURN jsonb_build_object(
        'success', false,
        'code', 'ALREADY_CHECKED_IN',
        'message', CASE WHEN p_checkpoint_type = 'gate' THEN 'Already checked in to this match'
          ELSE 'Already checked in at this booth' END,
        'action', p_action,
        'checkpoint_type', p_checkpoint_type,
        'first_scanned_at', v_session.scanned_at,
        'first_gate', v_session.gate,
        'candidate', v_candidate,
        'match_title', v_event.title
      );
    END IF;

    v_session_id := gen_random_uuid();
    INSERT INTO public.campaign_attendance(
      id, event_id, application_id, campaign_id, checkpoint_type, session_id,
      action, gate, scanned_by, scanned_at, notes
    ) VALUES (
      v_session_id, p_event_id, v_app.id, v_id.id, p_checkpoint_type, v_session_id,
      'check_in', v_checkpoint, p_scanned_by, v_now,
      CASE WHEN p_checkpoint_type = 'gate' THEN 'Gate entry recorded' ELSE 'Booth attendance started' END
    );
    RETURN jsonb_build_object(
      'success', true,
      'code', 'CHECK_IN_SUCCESS',
      'message', CASE WHEN p_checkpoint_type = 'gate' THEN 'Gate entry recorded'
        ELSE 'Booth check-in recorded' END,
      'action', p_action,
      'checkpoint_type', p_checkpoint_type,
      'scanned_at', v_now,
      'gate', v_checkpoint,
      'candidate', v_candidate,
      'match_title', v_event.title
    );
  END IF;

  -- For a booth, an exit closes the most recent open session at that same
  -- booth. Gate exits may use any gate, so they close the match's gate session.
  SELECT entry.* INTO v_session
  FROM public.campaign_attendance AS entry
  WHERE entry.campaign_id = v_id.id
    AND entry.event_id = p_event_id
    AND entry.checkpoint_type = p_checkpoint_type
    AND (p_checkpoint_type = 'gate' OR lower(entry.gate) = lower(v_checkpoint))
    AND entry.action = 'check_in'
    AND entry.session_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.campaign_attendance AS out_scan
      WHERE out_scan.session_id = entry.session_id AND out_scan.action = 'check_out'
    )
    AND NOT (
      p_checkpoint_type = 'gate' AND EXISTS (
        SELECT 1 FROM public.campaign_attendance AS legacy_exit
        WHERE legacy_exit.campaign_id = entry.campaign_id
          AND legacy_exit.event_id = entry.event_id
          AND legacy_exit.checkpoint_type = 'gate'
          AND legacy_exit.action = 'check_out'
          AND legacy_exit.session_id IS NULL
          AND legacy_exit.scanned_at >= entry.scanned_at
      )
    )
  ORDER BY entry.scanned_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.campaign_attendance(
      event_id, application_id, campaign_id, checkpoint_type, session_id,
      action, gate, scanned_by, scanned_at, notes
    ) VALUES (
      p_event_id, v_app.id, v_id.id, p_checkpoint_type, v_session.session_id,
      'check_out', v_checkpoint, p_scanned_by, v_now,
      CASE WHEN p_checkpoint_type = 'gate' THEN 'Gate exit recorded' ELSE 'Booth attendance ended' END
    );
    RETURN jsonb_build_object(
      'success', true,
      'code', 'CHECK_OUT_SUCCESS',
      'message', CASE WHEN p_checkpoint_type = 'gate' THEN 'Gate exit recorded'
        ELSE 'Booth check-out recorded' END,
      'action', p_action,
      'checkpoint_type', p_checkpoint_type,
      'scanned_at', v_now,
      'gate', v_checkpoint,
      'first_scanned_at', v_session.scanned_at,
      'first_gate', v_session.gate,
      'candidate', v_candidate,
      'match_title', v_event.title
    );
  END IF;

  IF p_checkpoint_type = 'gate' THEN
    SELECT entry.* INTO v_closed_session
    FROM public.campaign_attendance AS entry
    WHERE entry.campaign_id = v_id.id
      AND entry.event_id = p_event_id
      AND entry.checkpoint_type = 'gate'
      AND entry.action = 'check_in'
      AND (
        EXISTS (
          SELECT 1 FROM public.campaign_attendance AS out_scan
          WHERE out_scan.session_id = entry.session_id AND out_scan.action = 'check_out'
        ) OR EXISTS (
          SELECT 1 FROM public.campaign_attendance AS legacy_exit
          WHERE legacy_exit.campaign_id = entry.campaign_id
            AND legacy_exit.event_id = entry.event_id
            AND legacy_exit.checkpoint_type = 'gate'
            AND legacy_exit.action = 'check_out'
            AND legacy_exit.session_id IS NULL
            AND legacy_exit.scanned_at >= entry.scanned_at
        )
      )
    ORDER BY entry.scanned_at DESC
    LIMIT 1;
  ELSE
    SELECT entry.* INTO v_closed_session
    FROM public.campaign_attendance AS entry
    WHERE entry.campaign_id = v_id.id
      AND entry.event_id = p_event_id
      AND entry.checkpoint_type = 'booth'
      AND lower(entry.gate) = lower(v_checkpoint)
      AND entry.action = 'check_in'
      AND EXISTS (
        SELECT 1 FROM public.campaign_attendance AS out_scan
        WHERE out_scan.session_id = entry.session_id AND out_scan.action = 'check_out'
      )
    ORDER BY entry.scanned_at DESC
    LIMIT 1;
  END IF;

  IF FOUND THEN
    INSERT INTO public.campaign_attendance(
      event_id, application_id, campaign_id, checkpoint_type, session_id,
      action, gate, scanned_by, scanned_at, notes
    ) VALUES (
      p_event_id, v_app.id, v_id.id, p_checkpoint_type, v_closed_session.session_id,
      'duplicate_attempt', v_checkpoint, p_scanned_by, v_now,
      CASE WHEN p_checkpoint_type = 'gate' THEN 'Gate session was already checked out'
        ELSE 'Booth session was already checked out' END
    );
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_OUT',
      'message', CASE WHEN p_checkpoint_type = 'gate' THEN 'Already checked out of this match'
        ELSE 'Already checked out of this booth session' END,
      'action', p_action,
      'checkpoint_type', p_checkpoint_type,
      'first_scanned_at', v_closed_session.scanned_at,
      'first_gate', v_closed_session.gate,
      'candidate', v_candidate,
      'match_title', v_event.title
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'code', 'NOT_CHECKED_IN',
    'message', CASE WHEN p_checkpoint_type = 'gate' THEN 'No open gate check-in exists for this match'
      ELSE 'No open check-in exists at this booth' END,
    'action', p_action,
    'checkpoint_type', p_checkpoint_type,
    'candidate', v_candidate,
    'match_title', v_event.title
  );
END;
$$;

-- Keep older Admin builds compatible during a rolling app deployment. The old
-- entry-only action now creates the same session record as the new scanner.
CREATE OR REPLACE FUNCTION public.verify_and_check_in_campaign_id(
  p_qr_token TEXT,
  p_gate TEXT,
  p_scanned_by TEXT,
  p_event_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  v_result := public.record_campaign_attendance_scan(
    p_qr_token, 'check_in', 'gate', p_gate, p_event_id, p_scanned_by
  );
  IF v_result ->> 'code' = 'INVALID_CHECKPOINT' THEN
    v_result := v_result || jsonb_build_object('code', 'INVALID_GATE', 'message', 'Select a valid gate');
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.record_campaign_attendance_scan(TEXT, TEXT, TEXT, TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_campaign_attendance_scan(TEXT, TEXT, TEXT, TEXT, UUID, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID)
  TO service_role;

REVOKE ALL ON public.campaign_attendance FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.campaign_attendance TO service_role;
