-- Continue workforce registration IDs after any registrations created before
-- the per-department counters were installed. Never move an existing counter
-- backwards when this migration is rerun.
WITH department_prefixes (department, prefix) AS (
  VALUES
    ('ahibi', 'AHB'),
    ('volunteer', 'VOL'),
    ('media', 'MED'),
    ('crew', 'CRW'),
    ('management', 'MGT'),
    ('officials', 'OFC'),
    ('medical', 'HLT')
), existing_maxima AS (
  SELECT
    prefixes.department,
    MAX((regexp_match(application.application_number,
      '^NUSC-' || prefixes.prefix || '-([0-9]+)$'))[1]::BIGINT) AS last_number
  FROM department_prefixes AS prefixes
  JOIN public.campaign_applications AS application
    ON application.category = prefixes.department
  WHERE application.application_number ~ ('^NUSC-' || prefixes.prefix || '-[0-9]+$')
  GROUP BY prefixes.department
)
INSERT INTO public.workforce_registration_counters AS counters (department, last_number)
SELECT department, last_number
FROM existing_maxima
WHERE last_number > 0
ON CONFLICT (department) DO UPDATE
SET last_number = GREATEST(counters.last_number, EXCLUDED.last_number);
