BEGIN;

-- The two earlier migration versions are present in the production ledger, but
-- the official match rows and classification safeguards are missing. Correct
-- only the six known TEST-labeled legacy rows, preserving their IDs and scans.
DO $$
DECLARE
  v_event_count INTEGER;
BEGIN
  SELECT count(*) INTO v_event_count
  FROM public.campaign_events AS event
  WHERE event.slug IN (
    'match-bd114f9f2636c773',
    'match-57feae127b018d1d',
    'match-ed45a286eb838576',
    'match-235518ab331746a2',
    'match-9da22921fe959144',
    'match-82ec4ced6bcf5fb9'
  );

  IF v_event_count <> 6 THEN
    RAISE EXCEPTION 'Expected the six reviewed TEST-labeled legacy matches; found %', v_event_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    WHERE event.slug IN (
      'match-bd114f9f2636c773',
      'match-57feae127b018d1d',
      'match-ed45a286eb838576',
      'match-235518ab331746a2',
      'match-9da22921fe959144',
      'match-82ec4ced6bcf5fb9'
    )
      AND (event.title NOT ILIKE '%TEST%' OR event.venue NOT ILIKE '%TEST%')
  ) THEN
    RAISE EXCEPTION 'A reviewed legacy match no longer has TEST title and venue labels';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    JOIN public.campaign_applications AS application
      ON application.event_id = event.id
      OR event.id = ANY(COALESCE(application.availability_match_ids, ARRAY[]::UUID[]))
    WHERE event.slug IN (
      'match-bd114f9f2636c773',
      'match-57feae127b018d1d',
      'match-ed45a286eb838576',
      'match-235518ab331746a2',
      'match-9da22921fe959144',
      'match-82ec4ced6bcf5fb9'
    )
  ) THEN
    RAISE EXCEPTION 'A TEST-labeled legacy match is referenced by a workforce application';
  END IF;
END;
$$;

-- Classification is immutable after correction. Temporarily remove the guard
-- so the narrowly identified legacy rows can be reclassified in this transaction.
DROP TRIGGER IF EXISTS campaign_event_classification_immutable ON public.campaign_events;

-- Match creation must not revive an already expired credential while extending
-- valid active IDs to the season end. The following migration installs the same
-- expiry guard for future event updates.
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
    AND credential.revoked_at IS NULL
    AND credential.valid_until >= clock_timestamp();
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.extend_campaign_credentials_to_match_end() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_campaign_credentials_to_match_end() TO service_role;

UPDATE public.campaign_events AS event
SET is_test = true,
    updated_at = clock_timestamp()
WHERE event.slug IN (
  'match-bd114f9f2636c773',
  'match-57feae127b018d1d',
  'match-ed45a286eb838576',
  'match-235518ab331746a2',
  'match-9da22921fe959144',
  'match-82ec4ced6bcf5fb9'
)
  AND event.is_test = false;

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
CREATE TRIGGER campaign_event_classification_immutable
  BEFORE UPDATE OF is_test ON public.campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_campaign_event_classification_change();

ALTER TABLE public.campaign_applications
  ALTER COLUMN availability_mode SET DEFAULT 'all';

CREATE OR REPLACE FUNCTION public.prevent_campaign_application_test_match_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TEMPORARY TABLE nusc_official_home_match_schedule (
  match_number INTEGER PRIMARY KEY,
  match_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO nusc_official_home_match_schedule(match_number, match_date, title, slug)
VALUES
  (1, DATE '2026-11-14', 'NUSC Home Match 1', 'nusc-home-match-1-2026-11-14'),
  (2, DATE '2026-11-30', 'NUSC Home Match 2', 'nusc-home-match-2-2026-11-30'),
  (3, DATE '2026-12-15', 'NUSC Home Match 3', 'nusc-home-match-3-2026-12-15'),
  (4, DATE '2026-12-19', 'NUSC Home Match 4', 'nusc-home-match-4-2026-12-19'),
  (5, DATE '2027-01-04', 'NUSC Home Match 5', 'nusc-home-match-5-2027-01-04'),
  (6, DATE '2027-01-09', 'NUSC Home Match 6', 'nusc-home-match-6-2027-01-09'),
  (7, DATE '2027-01-16', 'NUSC Home Match 7', 'nusc-home-match-7-2027-01-16'),
  (8, DATE '2027-02-06', 'NUSC Home Match 8', 'nusc-home-match-8-2027-02-06'),
  (9, DATE '2027-03-13', 'NUSC Home Match 9', 'nusc-home-match-9-2027-03-13'),
  (10, DATE '2027-03-20', 'NUSC Home Match 10', 'nusc-home-match-10-2027-03-20');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    JOIN nusc_official_home_match_schedule AS schedule_row
      ON (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE = schedule_row.match_date
    WHERE event.is_test = false
      AND event.slug <> schedule_row.slug
  ) THEN
    RAISE EXCEPTION 'An official event already occupies a scheduled date under an unexpected slug; review it before reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    JOIN nusc_official_home_match_schedule AS schedule_row ON event.slug = schedule_row.slug
    WHERE event.is_test = true
       OR (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE <> schedule_row.match_date
  ) THEN
    RAISE EXCEPTION 'A canonical NUSC home match slug has an unexpected date or TEST classification';
  END IF;
END;
$$;

-- Normalize canonical rows from the earlier seed migration in place, retaining
-- their IDs and any attendance references. The window is the full India-local day.
UPDATE public.campaign_events AS event
SET title = schedule_row.title,
    venue = 'Chumukedima Football Stadium, Nagaland',
    start_date = schedule_row.match_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
    end_date = ((schedule_row.match_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 millisecond',
    is_active = true,
    updated_at = clock_timestamp()
FROM nusc_official_home_match_schedule AS schedule_row
WHERE event.slug = schedule_row.slug
  AND event.is_test = false;

-- Insert only missing India-local match dates.
INSERT INTO public.campaign_events(
  title, slug, venue, start_date, end_date, is_active, is_test
)
SELECT
  schedule_row.title,
  schedule_row.slug,
  'Chumukedima Football Stadium, Nagaland',
  schedule_row.match_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
  ((schedule_row.match_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 millisecond',
  true,
  false
FROM nusc_official_home_match_schedule AS schedule_row
WHERE NOT EXISTS (
  SELECT 1
  FROM public.campaign_events AS event
  WHERE event.is_test = false
    AND (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE = schedule_row.match_date
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_events_one_official_per_india_day
  ON public.campaign_events(((start_date AT TIME ZONE 'Asia/Kolkata')::DATE))
  WHERE is_test = false;

CREATE INDEX IF NOT EXISTS campaign_events_test_start_date_idx
  ON public.campaign_events(is_test, start_date);

-- Both legacy permissive policies allowed TEST rows to reach public event reads.
-- Replace both so their OR cannot expose active TEST matches to anon/authenticated.
DROP POLICY IF EXISTS "Public read active events" ON public.campaign_events;
DROP POLICY IF EXISTS "Public read active official events" ON public.campaign_events;
CREATE POLICY "Public read active official events"
  ON public.campaign_events FOR SELECT
  USING (is_active = true AND is_test = false);

DROP POLICY IF EXISTS "campaign_test_events_not_public" ON public.campaign_events;
CREATE POLICY "campaign_test_events_not_public"
  ON public.campaign_events FOR SELECT TO anon, authenticated
  USING (is_active = true AND is_test = false);

DO $$
DECLARE
  v_active_official_count INTEGER;
  v_missing_match_count INTEGER;
  v_unexpected_match_count INTEGER;
BEGIN
  SELECT count(*) INTO v_active_official_count
  FROM public.campaign_events
  WHERE is_active = true AND is_test = false;

  SELECT count(*) INTO v_missing_match_count
  FROM nusc_official_home_match_schedule AS schedule_row
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    WHERE event.is_active = true
      AND event.is_test = false
      AND event.slug = schedule_row.slug
      AND (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE = schedule_row.match_date
      AND event.venue = 'Chumukedima Football Stadium, Nagaland'
  );

  SELECT count(*) INTO v_unexpected_match_count
  FROM public.campaign_events AS event
  WHERE event.is_active = true
    AND event.is_test = false
    AND NOT EXISTS (
      SELECT 1 FROM nusc_official_home_match_schedule AS schedule_row
      WHERE schedule_row.slug = event.slug
        AND schedule_row.match_date = (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE
    );

  IF v_active_official_count <> 10
     OR v_missing_match_count <> 0
     OR v_unexpected_match_count <> 0 THEN
    RAISE EXCEPTION 'Official match reconciliation failed: active=%, missing=%, unexpected=%',
      v_active_official_count, v_missing_match_count, v_unexpected_match_count;
  END IF;
END;
$$;

COMMIT;
