-- Additive repair. Historical attendance with no match is retained as legacy data.
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
INSERT INTO public.campaign_roles (category, name, code, description) VALUES
  ('ahibi', 'Gate 1 Scanning', 'ahibi_gate_1_scanning', 'Scan tickets at Gate 1'),
  ('ahibi', 'Gate 3 Scanning', 'ahibi_gate_3_scanning', 'Scan tickets at Gate 3'),
  ('ahibi', 'Gate 2 Security', 'ahibi_gate_2_security', 'Manage security at Gate 2'),
  ('ahibi', 'Gate 2 Frisking', 'ahibi_gate_2_frisking', 'Conduct entry screening at Gate 2'),
  ('ahibi', 'Supervisor', 'ahibi_supervisor', 'Supervise Ahibi operations'),
  ('ahibi', 'Tunnel Entry Team', 'ahibi_tunnel_entry', 'Manage tunnel entry'),
  ('ahibi', 'VIP Entry Team', 'ahibi_vip_entry', 'Manage VIP entry')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN (
  'super_admin', 'store_manager', 'content_editor', 'support', 'fulfillment_staff',
  'trials_manager', 'campaign_manager', 'reviewer', 'gate_staff'
));

CREATE TABLE IF NOT EXISTS public.campaign_rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL
);
ALTER TABLE public.campaign_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.campaign_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_campaign_rate_limit(
  p_bucket TEXT, p_limit INTEGER, p_window_seconds INTEGER
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_count INTEGER;
BEGIN
  IF length(p_bucket) NOT BETWEEN 1 AND 150 OR p_limit NOT BETWEEN 1 AND 100
     OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit configuration';
  END IF;
  INSERT INTO campaign_rate_limits AS limits (bucket, window_start, attempts)
  VALUES (p_bucket, clock_timestamp(), 1)
  ON CONFLICT (bucket) DO UPDATE SET
    attempts = CASE WHEN limits.window_start + make_interval(secs => p_window_seconds) <= clock_timestamp()
      THEN 1 ELSE LEAST(limits.attempts + 1, p_limit + 1) END,
    window_start = CASE WHEN limits.window_start + make_interval(secs => p_window_seconds) <= clock_timestamp()
      THEN clock_timestamp() ELSE limits.window_start END
  RETURNING attempts INTO v_count;
  RETURN v_count <= p_limit;
END $$;

-- Serialise issuance, review and scanning on the application, then the credential.
-- Reissuing is an explicit manager operation and invalidates both old bearer tokens.
CREATE OR REPLACE FUNCTION public.issue_campaign_id(
  p_application_id UUID, p_actor TEXT, p_reissue BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app campaign_applications%ROWTYPE; v_id campaign_ids%ROWTYPE;
BEGIN
  SELECT * INTO v_app FROM campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.application_status <> 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM campaign_roles WHERE id = v_app.assigned_role_id
      AND category = v_app.category AND is_active) THEN
    RAISE EXCEPTION 'Assign an active role in the applicant category first';
  END IF;
  SELECT * INTO v_id FROM campaign_ids WHERE application_id = p_application_id FOR UPDATE;
  IF FOUND AND NOT p_reissue THEN
    RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
  END IF;
  IF FOUND THEN
    UPDATE campaign_ids SET pass_slug = encode(extensions.gen_random_bytes(16), 'hex'),
      qr_token = encode(extensions.gen_random_bytes(32), 'hex'), issued_at = clock_timestamp(), issued_by = p_actor,
      valid_from = clock_timestamp(), valid_until = clock_timestamp() + interval '90 days',
      is_active = true, revoked_at = NULL, revoked_by = NULL, updated_at = clock_timestamp()
    WHERE id = v_id.id RETURNING * INTO v_id;
  ELSE
    INSERT INTO campaign_ids (application_id, id_number, issued_by, valid_until)
    VALUES (p_application_id, 'NUSC-ID-' || to_char(now(), 'YYYY') || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex')),
      p_actor, clock_timestamp() + interval '90 days') RETURNING * INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
END $$;

-- Repair already-approved applications without changing prior credential tokens.
UPDATE campaign_applications AS app SET assigned_role_id = preferred_role_id
WHERE application_status = 'approved' AND assigned_role_id IS NULL
  AND EXISTS (SELECT 1 FROM campaign_roles role WHERE role.id = app.preferred_role_id
    AND role.category = app.category AND role.is_active);
DO $$
DECLARE v_app RECORD;
BEGIN
  FOR v_app IN SELECT app.id FROM campaign_applications app
    JOIN campaign_roles role ON role.id = app.assigned_role_id AND role.category = app.category AND role.is_active
    WHERE app.application_status = 'approved'
  LOOP
    PERFORM issue_campaign_id(v_app.id, 'campaign-workflow-migration');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.review_campaign_application(
  p_application_id UUID, p_status TEXT, p_actor TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app campaign_applications%ROWTYPE; v_pass JSONB;
BEGIN
  IF p_status NOT IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled')
     OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid application status'; END IF;
  SELECT * INTO v_app FROM campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Applicant not found'; END IF;
  UPDATE campaign_applications SET application_status = p_status,
    assigned_role_id = CASE WHEN p_status = 'approved' THEN COALESCE(assigned_role_id, preferred_role_id) ELSE assigned_role_id END,
    admin_notes = COALESCE(p_notes, admin_notes), reviewed_at = clock_timestamp(),
    reviewed_by = p_actor, updated_at = clock_timestamp() WHERE id = p_application_id;
  IF p_status = 'approved' THEN
    v_pass := issue_campaign_id(p_application_id, p_actor);
  END IF;
  RETURN jsonb_build_object('success', true, 'credential', v_pass);
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_attendance_one_checkin_per_match
  ON campaign_attendance(campaign_id, event_id) WHERE action = 'check_in' AND event_id IS NOT NULL;
-- NOT VALID retains legacy rows while enforcing the invariant on all new writes.
ALTER TABLE campaign_attendance DROP CONSTRAINT IF EXISTS campaign_checkin_requires_match;
ALTER TABLE campaign_attendance ADD CONSTRAINT campaign_checkin_requires_match
  CHECK (action <> 'check_in' OR event_id IS NOT NULL) NOT VALID;

CREATE OR REPLACE FUNCTION public.verify_and_check_in_campaign_id(
  p_qr_token TEXT, p_gate TEXT, p_scanned_by TEXT, p_event_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id campaign_ids%ROWTYPE; v_app campaign_applications%ROWTYPE;
  v_event campaign_events%ROWTYPE; v_previous campaign_attendance%ROWTYPE;
  v_application_id UUID; v_now TIMESTAMPTZ; v_role TEXT; v_candidate JSONB;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'MATCH_REQUIRED', 'message', 'Select a match before scanning');
  END IF;
  SELECT * INTO v_event FROM campaign_events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND OR NOT v_event.is_active THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MATCH', 'message', 'This match is unavailable');
  END IF;
  IF p_gate IS NULL OR p_gate NOT IN ('Gate 1', 'Gate 2', 'Gate 3', 'Gate 4') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_GATE', 'message', 'Select a valid gate');
  END IF;
  SELECT application_id INTO v_application_id FROM campaign_ids WHERE qr_token = p_qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential not recognised');
  END IF;
  SELECT * INTO v_app FROM campaign_applications WHERE id = v_application_id FOR UPDATE;
  SELECT * INTO v_id FROM campaign_ids WHERE qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential has been replaced');
  END IF;
  v_now := clock_timestamp();
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
  SELECT CASE WHEN code = 'crew_others' THEN 'Others: ' || v_app.other_role ELSE name END
    INTO v_role FROM campaign_roles WHERE id = v_app.assigned_role_id AND category = v_app.category AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ROLE_REQUIRED', 'message', 'Candidate has no active assigned role');
  END IF;
  v_candidate := jsonb_build_object('id_number', v_id.id_number, 'full_name', v_app.full_name,
    'photo_storage_path', v_app.photo_storage_path, 'category', v_app.category,
    'assigned_role', v_role, 'assigned_zone', v_app.assigned_zone, 'assigned_shift', v_app.assigned_shift);
  SELECT * INTO v_previous FROM campaign_attendance WHERE campaign_id = v_id.id
    AND event_id = p_event_id AND action = 'check_in' LIMIT 1;
  IF FOUND THEN
    INSERT INTO campaign_attendance(event_id, application_id, campaign_id, action, gate, scanned_by, notes)
      VALUES(p_event_id, v_app.id, v_id.id, 'duplicate_attempt', p_gate, p_scanned_by, 'Already checked in to this match');
    RETURN jsonb_build_object('success', false, 'code', 'ALREADY_CHECKED_IN', 'message', 'Already checked in to this match',
      'first_scanned_at', v_previous.scanned_at, 'first_gate', v_previous.gate, 'first_scanned_by', v_previous.scanned_by,
      'candidate', v_candidate, 'match_title', v_event.title);
  END IF;
  INSERT INTO campaign_attendance(event_id, application_id, campaign_id, action, gate, scanned_by, scanned_at)
    VALUES(p_event_id, v_app.id, v_id.id, 'check_in', p_gate, p_scanned_by, v_now);
  RETURN jsonb_build_object('success', true, 'code', 'CHECK_IN_SUCCESS', 'message', 'Attendance recorded',
    'scanned_at', v_now, 'gate', p_gate, 'candidate', v_candidate, 'match_title', v_event.title);
END $$;

REVOKE ALL ON FUNCTION public.consume_campaign_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_campaign_application(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_campaign_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_campaign_application(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) TO service_role;
REVOKE ALL ON public.campaign_applications, public.campaign_ids, public.campaign_attendance FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.campaign_applications, public.campaign_ids, public.campaign_attendance,
  public.campaign_events, public.campaign_roles TO service_role;
GRANT SELECT ON public.campaign_events, public.campaign_roles TO anon, authenticated;
