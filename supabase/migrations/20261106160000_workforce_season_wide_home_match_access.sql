BEGIN;

DO $$
DECLARE
  v_official_match_count INTEGER;
BEGIN
  SELECT count(*) INTO v_official_match_count
  FROM public.campaign_events
  WHERE is_active = true AND is_test = false;

  IF v_official_match_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 active official NUSC home matches before granting season access; found %',
      v_official_match_count;
  END IF;
END;
$$;

-- Applications and approved workforce IDs always cover the official home season.
-- event_id remains available for staff duty assignment; it does not limit QR access.
CREATE OR REPLACE FUNCTION public.force_campaign_application_season_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  NEW.availability := 'Available for all 10 NUSC home matches';
  NEW.availability_mode := 'all';
  NEW.availability_match_ids := ARRAY[]::UUID[];
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.force_campaign_application_season_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.force_campaign_application_season_scope() TO service_role;
DROP TRIGGER IF EXISTS campaign_application_force_season_scope ON public.campaign_applications;
CREATE TRIGGER campaign_application_force_season_scope
  BEFORE INSERT OR UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.force_campaign_application_season_scope();

-- Ignore stale match-selection values while retaining any staff duty assignment.
UPDATE public.campaign_applications
SET availability = 'Available for all 10 NUSC home matches',
    availability_mode = 'all',
    availability_match_ids = ARRAY[]::UUID[],
    updated_at = clock_timestamp()
WHERE availability IS DISTINCT FROM 'Available for all 10 NUSC home matches'
   OR availability_mode IS DISTINCT FROM 'all'
   OR cardinality(COALESCE(availability_match_ids, ARRAY[]::UUID[])) <> 0;

CREATE OR REPLACE FUNCTION public.extend_campaign_credentials_to_match_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_test OR NOT NEW.is_active THEN RETURN NEW; END IF;

  UPDATE public.campaign_ids AS credential
  SET valid_until = GREATEST(credential.valid_until, NEW.end_date),
      updated_at = clock_timestamp()
  FROM public.campaign_applications AS application
  WHERE application.id = credential.application_id
    AND application.application_status = 'approved'
    AND credential.is_active
    AND credential.revoked_at IS NULL;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.extend_campaign_credentials_to_match_end() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_campaign_credentials_to_match_end() TO service_role;

CREATE OR REPLACE FUNCTION public.extend_campaign_credentials_to_application_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valid_until TIMESTAMPTZ;
BEGIN
  IF NEW.application_status <> 'approved' THEN RETURN NEW; END IF;

  SELECT max(event.end_date) INTO v_valid_until
  FROM public.campaign_events AS event
  WHERE event.is_active AND NOT event.is_test;

  IF v_valid_until IS NULL THEN RETURN NEW; END IF;
  UPDATE public.campaign_ids AS credential
  SET valid_until = GREATEST(credential.valid_until, v_valid_until),
      updated_at = clock_timestamp()
  WHERE credential.application_id = NEW.id
    AND credential.is_active
    AND credential.revoked_at IS NULL
    AND credential.valid_until >= clock_timestamp()
    AND credential.valid_until < v_valid_until;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_campaign_credentials_to_application_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_campaign_credentials_to_application_scope() TO service_role;

-- Keep existing approved QR tokens and make every active credential valid through
-- the final official home match. The pass token itself is not regenerated.
WITH official_season AS (
  SELECT max(end_date) AS valid_until
  FROM public.campaign_events
  WHERE is_active = true AND is_test = false
)
UPDATE public.campaign_ids AS credential
SET valid_until = GREATEST(credential.valid_until, official_season.valid_until),
    updated_at = clock_timestamp()
FROM public.campaign_applications AS application, official_season
WHERE credential.application_id = application.id
  AND application.application_status = 'approved'
  AND credential.is_active = true
  AND credential.revoked_at IS NULL
  AND official_season.valid_until > credential.valid_until;

CREATE OR REPLACE FUNCTION public.issue_campaign_id(
  p_application_id UUID, p_actor TEXT, p_reissue BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app public.campaign_applications%ROWTYPE;
  v_id public.campaign_ids%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_valid_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_app FROM public.campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.application_status <> 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_roles
    WHERE id = v_app.assigned_role_id AND category = v_app.category AND is_active
  ) THEN
    RAISE EXCEPTION 'Assign an active role in the applicant category first';
  END IF;

  SELECT GREATEST(
    v_now + interval '90 days',
    (SELECT max(event.end_date)
     FROM public.campaign_events AS event
     WHERE event.is_active AND NOT event.is_test)
  ) INTO v_valid_until;

  SELECT * INTO v_id FROM public.campaign_ids WHERE application_id = p_application_id FOR UPDATE;
  IF FOUND AND NOT p_reissue THEN
    UPDATE public.campaign_ids
    SET valid_until = GREATEST(valid_until, v_valid_until), updated_at = v_now
    WHERE id = v_id.id RETURNING * INTO v_id;
    RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
  END IF;
  IF FOUND THEN
    UPDATE public.campaign_ids
    SET pass_slug = encode(extensions.gen_random_bytes(16), 'hex'),
        qr_token = encode(extensions.gen_random_bytes(32), 'hex'),
        issued_at = v_now, issued_by = p_actor, valid_from = v_now, valid_until = v_valid_until,
        is_active = true, revoked_at = NULL, revoked_by = NULL, updated_at = v_now
    WHERE id = v_id.id RETURNING * INTO v_id;
  ELSE
    INSERT INTO public.campaign_ids (application_id, id_number, issued_by, valid_until)
    VALUES (
      p_application_id,
      'NUSC-ID-' || to_char(v_now, 'YYYY') || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex')),
      p_actor,
      v_valid_until
    ) RETURNING * INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
END
$$;

REVOKE ALL ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) TO service_role;

-- An assigned duty match does not narrow official season-pass access. Test scans
-- still respect a specific duty assignment and the existing test-match rules.
DO $$
DECLARE
  function_definition TEXT;
BEGIN
  function_definition := pg_get_functiondef(
    'public.record_campaign_attendance_scan(text,text,text,text,uuid,text)'::regprocedure
  );
  function_definition := regexp_replace(
    function_definition,
    $pattern$IF[[:space:]]+v_app\.event_id[[:space:]]+IS[[:space:]]+NOT[[:space:]]+NULL[[:space:]]+AND[[:space:]]+v_app\.event_id[[:space:]]*<>[[:space:]]*p_event_id[[:space:]]+THEN[[:space:]]+RETURN[[:space:]]+jsonb_build_object\([[:space:]]*'success',[[:space:]]*false,[[:space:]]*'code',[[:space:]]*'WRONG_MATCH',[[:space:]]*'message',[[:space:]]*'This credential is assigned to another match'[[:space:]]*\);[[:space:]]+END IF;$pattern$,
    $replacement$IF v_event.is_test AND v_app.event_id IS NOT NULL AND v_app.event_id <> p_event_id THEN
      RETURN jsonb_build_object('success', false, 'code', 'WRONG_MATCH', 'message', 'This credential is assigned to another match');
    END IF;$replacement$,
    'gi'
  );
  IF position('IF v_event.is_test AND v_app.event_id IS NOT NULL' IN function_definition) = 0
     OR position('IF v_app.event_id IS NOT NULL AND v_app.event_id <> p_event_id' IN function_definition) > 0 THEN
    RAISE EXCEPTION 'Attendance RPC could not be updated for season-wide official match access';
  END IF;
  EXECUTE function_definition;
END;
$$;

COMMIT;
