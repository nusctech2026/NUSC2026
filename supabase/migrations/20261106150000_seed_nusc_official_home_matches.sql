BEGIN;

-- Add a row only when the official India-local match date has no official
-- event. The unique partial index from the preceding migration is the final
-- duplicate guard. Existing event IDs and attendance stay attached in place.
-- The provisional window is 00:00 through 23:59 IST for attendance scanning,
-- not an actual kickoff time.
WITH official_matches(match_number, match_date) AS (
  VALUES
    (1, DATE '2026-11-14'),
    (2, DATE '2026-11-30'),
    (3, DATE '2026-12-15'),
    (4, DATE '2026-12-19'),
    (5, DATE '2027-01-04'),
    (6, DATE '2027-01-09'),
    (7, DATE '2027-01-16'),
    (8, DATE '2027-02-06'),
    (9, DATE '2027-03-13'),
    (10, DATE '2027-03-20')
)
INSERT INTO public.campaign_events(
  title, slug, venue, start_date, end_date, is_active, is_test
)
SELECT
  'NUSC Home Match ' || official.match_number,
  'nusc-home-match-' || official.match_number || '-' || to_char(official.match_date, 'YYYY-MM-DD'),
  'Chumukedima Football Stadium, Nagaland, India',
  official.match_date::TIMESTAMP AT TIME ZONE 'Asia/Kolkata',
  ((official.match_date + 1)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') - INTERVAL '1 millisecond',
  true,
  false
FROM official_matches AS official
WHERE NOT EXISTS (
  SELECT 1
  FROM public.campaign_events AS event
  WHERE event.is_test = false
    AND (event.start_date AT TIME ZONE 'Asia/Kolkata')::DATE = official.match_date
);

COMMIT;
