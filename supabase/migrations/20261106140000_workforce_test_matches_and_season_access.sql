BEGIN;

ALTER TABLE public.campaign_events
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.campaign_applications
  ALTER COLUMN availability_mode SET DEFAULT 'all';

-- The configured rows below were explicitly named and venued as tests. Their
-- match IDs and attendance remain intact; only their classification changes.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    WHERE event.is_test = false
      AND event.title ILIKE '%TEST%'
      AND event.venue ILIKE '%TEST%'
      AND EXISTS (
        SELECT 1 FROM public.campaign_applications AS application
        WHERE application.event_id = event.id OR event.id = ANY(application.availability_match_ids)
      )
  ) THEN
    RAISE EXCEPTION 'A test-labeled match is referenced by a workforce application; review it before classifying matches';
  END IF;
END;
$$;

UPDATE public.campaign_events AS event
SET is_test = true, updated_at = clock_timestamp()
WHERE event.is_test = false
  AND event.title ILIKE '%TEST%'
  AND event.venue ILIKE '%TEST%';

DROP POLICY IF EXISTS "Public read active events" ON public.campaign_events;
CREATE POLICY "Public read active official events"
  ON public.campaign_events FOR SELECT
  USING (is_active = true AND is_test = false);

-- Policies are permissive by default. Tighten the legacy policy too, so its OR
-- with the official-events policy cannot expose inactive official or TEST rows.
DROP POLICY IF EXISTS "campaign_test_events_not_public" ON public.campaign_events;
CREATE POLICY "campaign_test_events_not_public"
  ON public.campaign_events FOR SELECT TO anon, authenticated
  USING (is_active = true AND is_test = false);

CREATE INDEX IF NOT EXISTS campaign_events_test_start_date_idx
  ON public.campaign_events(is_test, start_date);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_events_one_official_per_india_day
  ON public.campaign_events(((start_date AT TIME ZONE 'Asia/Kolkata')::DATE))
  WHERE is_test = false;

CREATE OR REPLACE FUNCTION public.prevent_campaign_application_test_match_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.event_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.campaign_events AS event
    WHERE event.id = NEW.event_id AND event.is_test
  ) THEN
    RAISE EXCEPTION 'Workforce applications cannot be assigned to TEST matches';
  END IF;
  IF COALESCE(NEW.availability_mode, 'unsure') = 'selected' AND EXISTS (
    SELECT 1
    FROM unnest(COALESCE(NEW.availability_match_ids, ARRAY[]::UUID[])) AS selected(match_id)
    JOIN public.campaign_events AS event ON event.id = selected.match_id
    WHERE event.is_test
  ) THEN
    RAISE EXCEPTION 'TEST matches cannot be included in official workforce access scope';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_campaign_application_test_match_scope() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_campaign_application_test_match_scope() TO service_role;
DROP TRIGGER IF EXISTS campaign_applications_reject_test_matches ON public.campaign_applications;
CREATE TRIGGER campaign_applications_reject_test_matches
  BEFORE INSERT OR UPDATE OF event_id, availability_mode, availability_match_ids
  ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.prevent_campaign_application_test_match_scope();

CREATE OR REPLACE FUNCTION public.prevent_campaign_event_classification_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.is_test IS DISTINCT FROM OLD.is_test THEN
    RAISE EXCEPTION 'Campaign match classification is immutable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_campaign_event_classification_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_campaign_event_classification_change() TO service_role;
DROP TRIGGER IF EXISTS campaign_event_classification_immutable ON public.campaign_events;
CREATE TRIGGER campaign_event_classification_immutable
  BEFORE UPDATE OF is_test ON public.campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_campaign_event_classification_change();

CREATE OR REPLACE FUNCTION public.create_campaign_test_match(
  p_title TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_event public.campaign_events%ROWTYPE;
BEGIN
  IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 255 THEN
    RAISE EXCEPTION 'Enter a test match name up to 255 characters';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Choose a valid test match date';
  END IF;

  INSERT INTO public.campaign_events(
    title, slug, venue, start_date, end_date, is_active, is_test
  ) VALUES (
    btrim(p_title),
    'test-' || replace(gen_random_uuid()::TEXT, '-', ''),
    'TEST',
    p_start_date,
    p_end_date,
    true,
    true
  ) RETURNING * INTO v_event;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_event.id,
    'title', v_event.title,
    'start_date', v_event.start_date,
    'end_date', v_event.end_date,
    'is_test', v_event.is_test
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_campaign_test_match(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_test_match(TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_campaign_test_match(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_title TEXT;
  v_attendance_count INTEGER;
  v_event_count INTEGER;
BEGIN
  SELECT event.title INTO v_title
  FROM public.campaign_events AS event
  WHERE event.id = p_event_id AND event.is_test = true
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only an existing TEST match can be deleted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.campaign_applications AS application
    WHERE application.event_id = p_event_id OR p_event_id = ANY(application.availability_match_ids)
  ) THEN
    RAISE EXCEPTION 'TEST match is referenced by a workforce application and cannot be deleted';
  END IF;

  DELETE FROM public.campaign_attendance WHERE event_id = p_event_id;
  GET DIAGNOSTICS v_attendance_count = ROW_COUNT;

  DELETE FROM public.campaign_events WHERE id = p_event_id AND is_test = true;
  GET DIAGNOSTICS v_event_count = ROW_COUNT;
  IF v_event_count <> 1 THEN
    RAISE EXCEPTION 'TEST match could not be deleted';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'title', v_title,
    'deleted_attendance_count', v_attendance_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_campaign_test_match(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_campaign_test_match(UUID) TO service_role;

-- Reuse active season-wide credentials across official dates without changing
-- QR tokens. Expired, revoked, or inactive credentials stay unchanged.
WITH official_ranges AS (
  SELECT
    application.id,
    CASE
      WHEN application.event_id IS NOT NULL THEN (
        SELECT event.end_date FROM public.campaign_events AS event
        WHERE event.id = application.event_id AND event.is_active AND NOT event.is_test
      )
      WHEN application.availability_mode = 'selected' THEN (
        SELECT max(event.end_date) FROM public.campaign_events AS event
        WHERE event.id = ANY(application.availability_match_ids) AND event.is_active AND NOT event.is_test
      )
      ELSE (
        SELECT max(event.end_date) FROM public.campaign_events AS event
        WHERE event.is_active AND NOT event.is_test
      )
    END AS valid_until
  FROM public.campaign_applications AS application
  WHERE application.application_status = 'approved'
)
UPDATE public.campaign_ids AS credential
SET valid_until = official_ranges.valid_until,
    updated_at = clock_timestamp()
FROM official_ranges
WHERE credential.application_id = official_ranges.id
  AND credential.is_active
  AND credential.revoked_at IS NULL
  AND credential.valid_until >= clock_timestamp()
  AND official_ranges.valid_until > credential.valid_until;

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
    $replacement$IF v_app.event_id IS NOT NULL AND v_app.event_id <> p_event_id THEN
      RETURN jsonb_build_object('success', false, 'code', 'WRONG_MATCH', 'message', 'This credential is assigned to another match');
    END IF;
    IF v_event.is_test AND COALESCE(v_app.availability_mode, 'unsure') <> 'all' THEN
      RETURN jsonb_build_object('success', false, 'code', 'WRONG_MATCH', 'message', 'TEST matches require season-wide workforce access');
    END IF;
    IF NOT v_event.is_test
       AND COALESCE(v_app.availability_mode, 'unsure') = 'selected'
       AND NOT (p_event_id = ANY(COALESCE(v_app.availability_match_ids, ARRAY[]::UUID[]))) THEN
      RETURN jsonb_build_object('success', false, 'code', 'WRONG_MATCH', 'message', 'This credential is not assigned to this match');
    END IF;$replacement$,
    'gi'
  );
  IF position('TEST matches require season-wide workforce access' IN function_definition) = 0
     OR position('This credential is not assigned to this match' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Attendance RPC could not be updated with TEST and selected-match access checks';
  END IF;
  EXECUTE function_definition;

  function_definition := pg_get_functiondef(
    'public.issue_campaign_id(uuid,text,boolean)'::regprocedure
  );
  -- Preserve the production issuer body and its reuse/reissue behavior. Normalize
  -- only its date-query predicates; production may already include the TEST
  -- exclusion in the season-wide query.
  function_definition := regexp_replace(
    function_definition,
    'WHERE[[:space:]]+event\.id[[:space:]]*=[[:space:]]*v_app\.event_id([[:space:]]+AND[[:space:]]+event\.is_active)?([[:space:]]+AND[[:space:]]+NOT[[:space:]]+event\.is_test)?',
    'WHERE event.id = v_app.event_id AND event.is_active AND NOT event.is_test',
    'gi'
  );
  function_definition := regexp_replace(
    function_definition,
    'WHERE[[:space:]]+event\.is_active([[:space:]]+AND[[:space:]]+NOT[[:space:]]+event\.is_test)?',
    'WHERE event.is_active AND NOT event.is_test',
    'gi'
  );
  IF position('WHERE event.id = v_app.event_id AND event.is_active AND NOT event.is_test' IN function_definition) = 0
     OR position('WHERE event.is_active AND NOT event.is_test' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Credential issuer could not be normalized to active official match dates';
  END IF;
  EXECUTE function_definition;

  function_definition := pg_get_functiondef(
    'public.review_campaign_application(uuid,text,uuid,text)'::regprocedure
  );
  function_definition := regexp_replace(
    function_definition,
    'WHERE[[:space:]]+event\.id[[:space:]]*=[[:space:]]*v_app\.event_id([[:space:]]+AND[[:space:]]+event\.is_active)?([[:space:]]+AND[[:space:]]+NOT[[:space:]]+event\.is_test)?',
    'WHERE event.id = v_app.event_id AND event.is_active AND NOT event.is_test',
    'gi'
  );
  function_definition := regexp_replace(
    function_definition,
    'WHERE[[:space:]]+event\.is_active([[:space:]]+AND[[:space:]]+NOT[[:space:]]+event\.is_test)?',
    'WHERE event.is_active AND NOT event.is_test',
    'gi'
  );
  function_definition := regexp_replace(
    function_definition,
    'WHERE[[:space:]]+application_id[[:space:]]*=[[:space:]]*p_application_id[[:space:]]*;',
    'WHERE application_id = p_application_id AND is_active AND revoked_at IS NULL AND valid_until >= v_now;',
    'gi'
  );
  IF position('WHERE event.id = v_app.event_id AND event.is_active AND NOT event.is_test' IN function_definition) = 0
     OR position('WHERE event.is_active AND NOT event.is_test' IN function_definition) = 0
     OR position('WHERE application_id = p_application_id AND is_active AND revoked_at IS NULL AND valid_until >= v_now;' IN function_definition) = 0 THEN
    RAISE EXCEPTION 'Application approval could not be normalized to active official match dates';
  END IF;
  EXECUTE function_definition;
END;
$$;

CREATE OR REPLACE FUNCTION public.extend_campaign_credentials_to_match_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_test THEN RETURN NEW; END IF;
  UPDATE public.campaign_ids AS credential
  SET valid_until = GREATEST(credential.valid_until, NEW.end_date),
      updated_at = clock_timestamp()
  FROM public.campaign_applications AS application
  WHERE application.id = credential.application_id
    AND application.application_status = 'approved'
    AND credential.is_active
    AND credential.revoked_at IS NULL
    AND NEW.is_active
    AND (application.event_id IS NULL OR application.event_id = NEW.id);
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

  IF NEW.event_id IS NOT NULL THEN
    SELECT event.end_date INTO v_valid_until
    FROM public.campaign_events AS event
    WHERE event.id = NEW.event_id AND event.is_active AND NOT event.is_test;
  ELSIF NEW.availability_mode = 'selected' THEN
    SELECT max(event.end_date) INTO v_valid_until
    FROM public.campaign_events AS event
    WHERE event.id = ANY(COALESCE(NEW.availability_match_ids, ARRAY[]::UUID[]))
      AND event.is_active AND NOT event.is_test;
  ELSE
    SELECT max(event.end_date) INTO v_valid_until
    FROM public.campaign_events AS event
    WHERE event.is_active AND NOT event.is_test;
  END IF;

  IF v_valid_until IS NULL THEN RETURN NEW; END IF;
  UPDATE public.campaign_ids AS credential
  SET valid_until = v_valid_until, updated_at = clock_timestamp()
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
DROP TRIGGER IF EXISTS campaign_application_scope_extends_credential ON public.campaign_applications;
CREATE TRIGGER campaign_application_scope_extends_credential
  AFTER UPDATE OF event_id, availability_mode, availability_match_ids, application_status
  ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.extend_campaign_credentials_to_application_scope();

COMMIT;
