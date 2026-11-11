BEGIN;

-- Keep each event row (and its attendance history) attached to the same
-- opponent while applying the updated 2026-27 home schedule.
DO $$
DECLARE
  expected_match_count INTEGER;
BEGIN
  WITH schedule(old_slug, new_slug) AS (
    VALUES
      ('nusc-home-match-1-2026-11-14', 'nusc-home-match-1-2026-11-14'),
      ('nusc-home-match-2-2026-11-30', 'nusc-home-match-2-2026-11-30'),
      ('nusc-home-match-3-2026-12-15', 'nusc-home-match-4-2026-12-15'),
      ('nusc-home-match-4-2026-12-19', 'nusc-home-match-5-2026-12-19'),
      ('nusc-home-match-5-2027-01-04', 'nusc-home-match-6-2027-01-04'),
      ('nusc-home-match-6-2027-01-09', 'nusc-home-match-7-2027-01-09'),
      ('nusc-home-match-7-2027-01-16', 'nusc-home-match-8-2027-01-16'),
      ('nusc-home-match-8-2027-02-06', 'nusc-home-match-3-2026-12-07'),
      ('nusc-home-match-9-2027-03-13', 'nusc-home-match-9-2027-03-13'),
      ('nusc-home-match-10-2027-03-20', 'nusc-home-match-10-2027-03-20')
  )
  SELECT count(*) INTO expected_match_count
  FROM schedule
  WHERE (
    SELECT count(*)
    FROM public.campaign_events AS event
    WHERE event.is_test = false
      AND event.slug IN (schedule.old_slug, schedule.new_slug)
  ) <> 1;

  IF expected_match_count <> 0 THEN
    RAISE EXCEPTION 'Expected exactly one existing official event row for every NUSC home match; mismatches: %', expected_match_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_events AS event
    WHERE event.is_test = false
      AND (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE = DATE '2026-12-07'
      AND event.slug NOT IN ('nusc-home-match-8-2027-02-06', 'nusc-home-match-3-2026-12-07')
  ) THEN
    RAISE EXCEPTION 'December 7, 2026 is already assigned to a different official campaign event';
  END IF;
END;
$$;

WITH schedule(old_slug, new_slug, title, match_date) AS (
  VALUES
    ('nusc-home-match-1-2026-11-14', 'nusc-home-match-1-2026-11-14', 'NUSC Home Match 1 - Gokulam Kerala FC', DATE '2026-11-14'),
    ('nusc-home-match-2-2026-11-30', 'nusc-home-match-2-2026-11-30', 'NUSC Home Match 2 - Dempo SC', DATE '2026-11-30'),
    ('nusc-home-match-3-2026-12-15', 'nusc-home-match-4-2026-12-15', 'NUSC Home Match 4 - Sreenidi Deccan FC', DATE '2026-12-15'),
    ('nusc-home-match-4-2026-12-19', 'nusc-home-match-5-2026-12-19', 'NUSC Home Match 5 - Mohammedan SC', DATE '2026-12-19'),
    ('nusc-home-match-5-2027-01-04', 'nusc-home-match-6-2027-01-04', 'NUSC Home Match 6 - Rajasthan United FC', DATE '2027-01-04'),
    ('nusc-home-match-6-2027-01-09', 'nusc-home-match-7-2027-01-09', 'NUSC Home Match 7 - FC Bengaluru United', DATE '2027-01-09'),
    ('nusc-home-match-7-2027-01-16', 'nusc-home-match-8-2027-01-16', 'NUSC Home Match 8 - Shillong Lajong FC', DATE '2027-01-16'),
    ('nusc-home-match-8-2027-02-06', 'nusc-home-match-3-2026-12-07', 'NUSC Home Match 3 - Chanmari FC', DATE '2026-12-07'),
    ('nusc-home-match-9-2027-03-13', 'nusc-home-match-9-2027-03-13', 'NUSC Home Match 9 - Samaleswari SC', DATE '2027-03-13'),
    ('nusc-home-match-10-2027-03-20', 'nusc-home-match-10-2027-03-20', 'NUSC Home Match 10 - Real Kashmir FC', DATE '2027-03-20')
)
UPDATE public.campaign_events AS event
SET slug = schedule.new_slug,
    title = schedule.title,
    start_date = schedule.match_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
    end_date = ((schedule.match_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 millisecond',
    updated_at = clock_timestamp()
FROM schedule
WHERE event.is_test = false
  AND event.slug IN (schedule.old_slug, schedule.new_slug);

COMMIT;
