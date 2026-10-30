-- Expand the campaign registration workflow into the NUSC IFL 2026-27 workforce portal.
-- Existing application and accreditation records remain in place.

ALTER TABLE public.campaign_roles
  DROP CONSTRAINT IF EXISTS campaign_roles_category_check;
ALTER TABLE public.campaign_roles
  ADD CONSTRAINT campaign_roles_category_check
  CHECK (category IN ('ahibi', 'volunteer', 'crew', 'management', 'officials', 'medical'));

ALTER TABLE public.campaign_applications
  DROP CONSTRAINT IF EXISTS campaign_applications_category_check;
ALTER TABLE public.campaign_applications
  ADD CONSTRAINT campaign_applications_category_check
  CHECK (category IN ('ahibi', 'volunteer', 'crew', 'management', 'officials', 'medical'));

-- The workforce form only collects the fields defined for this registration.
-- Keep the older campaign-only fields nullable so historical records remain readable.
ALTER TABLE public.campaign_applications
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN availability DROP NOT NULL,
  ALTER COLUMN emergency_contact_name DROP NOT NULL,
  ALTER COLUMN emergency_contact_phone DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS organisation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS organisation_other VARCHAR(255),
  ADD COLUMN IF NOT EXISTS designation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS potential_duplicate BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_updated_by VARCHAR(255);

CREATE TABLE IF NOT EXISTS public.workforce_registration_counters (
  department VARCHAR(50) PRIMARY KEY,
  last_number BIGINT NOT NULL CHECK (last_number > 0)
);
ALTER TABLE public.workforce_registration_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workforce_registration_counters FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.workforce_registration_counters TO service_role;

CREATE OR REPLACE FUNCTION public.next_workforce_registration_id(p_department TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_prefix TEXT;
  v_number BIGINT;
BEGIN
  v_prefix := CASE p_department
    WHEN 'ahibi' THEN 'AHB'
    WHEN 'volunteer' THEN 'VOL'
    WHEN 'crew' THEN 'CRW'
    WHEN 'management' THEN 'MGT'
    WHEN 'officials' THEN 'OFC'
    WHEN 'medical' THEN 'HLT'
    ELSE NULL
  END;
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Invalid workforce department';
  END IF;

  INSERT INTO public.workforce_registration_counters AS counters (department, last_number)
  VALUES (p_department, 1)
  ON CONFLICT (department) DO UPDATE
    SET last_number = counters.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN 'NUSC-' || v_prefix || '-' || lpad(v_number::TEXT, GREATEST(3, length(v_number::TEXT)), '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_workforce_registration_id(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_workforce_registration_id(TEXT) TO service_role;

-- Allocate the next number atomically. Counter rows are intentionally retained if an
-- application is deleted, so an issued registration ID is never reused.
INSERT INTO public.campaign_roles (category, name, code, description) VALUES
  ('crew', 'Others', 'crew_others', 'Other matchday crew role'),
  ('management', 'Management', 'management_role', 'Club or public-sector management'),
  ('officials', 'Referee', 'official_referee', 'Match referee'),
  ('officials', 'Assistant Referee', 'official_assistant_referee', 'Assistant match referee'),
  ('officials', 'Fourth Official', 'official_fourth_official', 'Fourth official'),
  ('officials', 'Match Commissioner', 'official_match_commissioner', 'Match commissioner'),
  ('officials', 'Referee Assessor', 'official_referee_assessor', 'Referee assessor'),
  ('officials', 'Others', 'official_others', 'Other match official role'),
  ('medical', 'Doctor / Medical Officer', 'medical_doctor', 'Doctor or medical officer'),
  ('medical', 'Physiotherapist', 'medical_physiotherapist', 'Team physiotherapist'),
  ('medical', 'Paramedic', 'medical_paramedic', 'Paramedic'),
  ('medical', 'First Aid Team', 'medical_first_aid', 'First aid team'),
  ('medical', 'Ambulance Personnel', 'medical_ambulance', 'Ambulance personnel'),
  ('medical', 'Medical Supervisor', 'medical_supervisor', 'Medical supervisor'),
  ('medical', 'Others', 'medical_others', 'Other medical team role')
ON CONFLICT (code) DO NOTHING;

-- Mark a repeated phone or email for administrator review without exposing whether a
-- matching registration exists to the applicant or blocking a legitimate resubmission.
CREATE OR REPLACE FUNCTION public.flag_duplicate_workforce_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('workforce-phone:' || NEW.phone, 0));
  END IF;
  IF NEW.email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('workforce-email:' || lower(NEW.email), 0));
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.campaign_applications AS existing
    WHERE (NEW.phone IS NOT NULL AND existing.phone = NEW.phone)
       OR (NEW.email IS NOT NULL AND lower(existing.email) = lower(NEW.email))
  ) INTO NEW.potential_duplicate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_application_flag_duplicate ON public.campaign_applications;
CREATE TRIGGER campaign_application_flag_duplicate
  BEFORE INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.flag_duplicate_workforce_application();
REVOKE ALL ON FUNCTION public.flag_duplicate_workforce_application() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flag_duplicate_workforce_application() TO service_role;

CREATE TABLE IF NOT EXISTS public.campaign_application_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  changed_fields JSONB NOT NULL
);
ALTER TABLE public.campaign_application_change_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.campaign_application_change_history FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.campaign_application_change_history TO service_role;

CREATE OR REPLACE FUNCTION public.audit_campaign_application_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_changes JSONB;
BEGIN
  v_before := to_jsonb(OLD) - ARRAY['updated_at', 'last_updated_by', 'reviewed_at', 'reviewed_by'];
  v_after := to_jsonb(NEW) - ARRAY['updated_at', 'last_updated_by', 'reviewed_at', 'reviewed_by'];
  SELECT COALESCE(
    jsonb_object_agg(field_name, jsonb_build_object('from', v_before -> field_name, 'to', v_after -> field_name)),
    '{}'::JSONB
  )
  INTO v_changes
  FROM jsonb_object_keys(v_after) AS fields(field_name)
  WHERE v_before -> field_name IS DISTINCT FROM v_after -> field_name;

  IF v_changes <> '{}'::JSONB THEN
    INSERT INTO public.campaign_application_change_history (application_id, changed_by, changed_fields)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.last_updated_by, ''), NULLIF(NEW.reviewed_by, ''), current_user),
      v_changes
    );
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_campaign_application_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_campaign_application_update() TO service_role;

DROP TRIGGER IF EXISTS campaign_application_audit_update ON public.campaign_applications;
CREATE TRIGGER campaign_application_audit_update
  AFTER UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.audit_campaign_application_update();

-- Department totals used by the authenticated operations dashboard.
CREATE OR REPLACE FUNCTION public.get_campaign_dashboard_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'total_applications', COUNT(*),
    'submitted', COUNT(*) FILTER (WHERE application_status = 'submitted'),
    'under_review', COUNT(*) FILTER (WHERE application_status = 'under_review'),
    'approved', COUNT(*) FILTER (WHERE application_status = 'approved'),
    'waitlisted', COUNT(*) FILTER (WHERE application_status = 'waitlisted'),
    'rejected', COUNT(*) FILTER (WHERE application_status = 'rejected'),
    'ahibi_count', COUNT(*) FILTER (WHERE category = 'ahibi'),
    'volunteer_count', COUNT(*) FILTER (WHERE category = 'volunteer'),
    'crew_count', COUNT(*) FILTER (WHERE category = 'crew'),
    'management_count', COUNT(*) FILTER (WHERE category = 'management'),
    'officials_count', COUNT(*) FILTER (WHERE category = 'officials'),
    'medical_count', COUNT(*) FILTER (WHERE category = 'medical'),
    'potential_duplicate_count', COUNT(*) FILTER (WHERE potential_duplicate)
  )
  FROM public.campaign_applications
  WHERE p_event_id IS NULL OR event_id = p_event_id;
$$;
REVOKE ALL ON FUNCTION public.get_campaign_dashboard_stats(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_dashboard_stats(UUID) TO service_role;

-- New workforce cards use the department registration ID as their displayed ID. Old
-- issued records keep their existing number because the reissue branch does not change it.
CREATE OR REPLACE FUNCTION public.issue_campaign_id(
  p_application_id UUID, p_actor TEXT, p_reissue BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_app public.campaign_applications%ROWTYPE;
  v_id public.campaign_ids%ROWTYPE;
  v_from TIMESTAMPTZ;
  v_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_app FROM public.campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.application_status <> 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_roles
    WHERE id = v_app.assigned_role_id AND category = v_app.category AND is_active
  ) THEN
    RAISE EXCEPTION 'Assign an active role in the applicant department first';
  END IF;

  IF v_app.event_id IS NOT NULL THEN
    SELECT start_date, end_date INTO v_from, v_until
    FROM public.campaign_events WHERE id = v_app.event_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Assigned match is unavailable'; END IF;
  ELSE
    SELECT min(start_date), max(end_date) INTO v_from, v_until
    FROM public.campaign_events WHERE is_active;
    v_from := COALESCE(v_from, clock_timestamp());
    v_until := COALESCE(v_until, clock_timestamp() + interval '365 days');
  END IF;
  IF v_until < v_from THEN RAISE EXCEPTION 'Accreditation validity dates are invalid'; END IF;

  SELECT * INTO v_id FROM public.campaign_ids WHERE application_id = p_application_id FOR UPDATE;
  IF FOUND AND NOT p_reissue THEN
    RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
  END IF;
  IF FOUND THEN
    UPDATE public.campaign_ids SET
      pass_slug = encode(extensions.gen_random_bytes(16), 'hex'),
      qr_token = encode(extensions.gen_random_bytes(32), 'hex'),
      issued_at = clock_timestamp(),
      issued_by = p_actor,
      valid_from = v_from,
      valid_until = v_until,
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      updated_at = clock_timestamp()
    WHERE id = v_id.id RETURNING * INTO v_id;
  ELSE
    INSERT INTO public.campaign_ids (application_id, id_number, issued_by, valid_from, valid_until)
    VALUES (p_application_id, v_app.application_number, p_actor, v_from, v_until)
    RETURNING * INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_and_check_in_campaign_id(
  p_qr_token TEXT, p_gate TEXT, p_scanned_by TEXT, p_event_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_id public.campaign_ids%ROWTYPE;
  v_app public.campaign_applications%ROWTYPE;
  v_event public.campaign_events%ROWTYPE;
  v_previous public.campaign_attendance%ROWTYPE;
  v_application_id UUID;
  v_now TIMESTAMPTZ;
  v_role TEXT;
  v_candidate JSONB;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'MATCH_REQUIRED', 'message', 'Select a match before scanning');
  END IF;
  SELECT * INTO v_event FROM public.campaign_events WHERE id = p_event_id FOR SHARE;
  IF NOT FOUND OR NOT v_event.is_active THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_MATCH', 'message', 'This match is unavailable');
  END IF;
  IF p_gate IS NULL OR p_gate NOT IN ('Gate 1', 'Gate 2', 'Gate 3', 'Gate 4') THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_GATE', 'message', 'Select a valid gate');
  END IF;
  SELECT application_id INTO v_application_id FROM public.campaign_ids WHERE qr_token = p_qr_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Credential not recognised');
  END IF;
  SELECT * INTO v_app FROM public.campaign_applications WHERE id = v_application_id FOR UPDATE;
  SELECT * INTO v_id FROM public.campaign_ids WHERE qr_token = p_qr_token FOR UPDATE;
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
  SELECT CASE
      WHEN role.code ~ '_others$' AND NULLIF(v_app.other_role, '') IS NOT NULL
        THEN 'Others: ' || v_app.other_role
      ELSE role.name
    END
    INTO v_role
    FROM public.campaign_roles AS role
    WHERE role.id = v_app.assigned_role_id AND role.category = v_app.category AND role.is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'ROLE_REQUIRED', 'message', 'Candidate has no active assigned role');
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
  SELECT * INTO v_previous FROM public.campaign_attendance
    WHERE campaign_id = v_id.id AND event_id = p_event_id AND action = 'check_in' LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.campaign_attendance(event_id, application_id, campaign_id, action, gate, scanned_by, notes)
      VALUES(p_event_id, v_app.id, v_id.id, 'duplicate_attempt', p_gate, p_scanned_by, 'Already checked in to this match');
    RETURN jsonb_build_object(
      'success', false, 'code', 'ALREADY_CHECKED_IN', 'message', 'Already checked in to this match',
      'first_scanned_at', v_previous.scanned_at, 'first_gate', v_previous.gate,
      'first_scanned_by', v_previous.scanned_by, 'candidate', v_candidate, 'match_title', v_event.title
    );
  END IF;
  INSERT INTO public.campaign_attendance(event_id, application_id, campaign_id, action, gate, scanned_by, scanned_at)
    VALUES(p_event_id, v_app.id, v_id.id, 'check_in', p_gate, p_scanned_by, v_now);
  RETURN jsonb_build_object(
    'success', true, 'code', 'CHECK_IN_SUCCESS', 'message', 'Attendance recorded',
    'scanned_at', v_now, 'gate', p_gate, 'candidate', v_candidate, 'match_title', v_event.title
  );
END;
$$;
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.review_campaign_application(
  p_application_id UUID, p_status TEXT, p_actor TEXT, p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_app public.campaign_applications%ROWTYPE;
  v_pass JSONB;
BEGIN
  IF p_status NOT IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled')
     OR p_status IS NULL THEN
    RAISE EXCEPTION 'Invalid application status';
  END IF;
  SELECT * INTO v_app FROM public.campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Applicant not found'; END IF;

  UPDATE public.campaign_applications
  SET application_status = p_status,
      assigned_role_id = CASE WHEN p_status = 'approved' THEN COALESCE(assigned_role_id, preferred_role_id) ELSE assigned_role_id END,
      admin_notes = COALESCE(p_notes, admin_notes),
      reviewed_at = clock_timestamp(),
      reviewed_by = p_actor,
      last_updated_by = p_actor,
      updated_at = clock_timestamp()
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    v_pass := public.issue_campaign_id(p_application_id, p_actor);
  END IF;
  RETURN jsonb_build_object('success', true, 'credential', v_pass);
END;
$$;
REVOKE ALL ON FUNCTION public.review_campaign_application(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campaign_application(UUID, TEXT, TEXT, TEXT) TO service_role;
