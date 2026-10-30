-- Record whether Crew applicants are representing an organisation or applying
-- independently, and provide a verifier contact for organisation-backed crews.
-- campaign_applications keeps its existing service-role-only access model.
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS crew_work_arrangement TEXT,
  ADD COLUMN IF NOT EXISTS crew_organisation VARCHAR(255),
  ADD COLUMN IF NOT EXISTS crew_lead_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS crew_lead_phone VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_crew_affiliation_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_crew_affiliation_check CHECK (
        (
          crew_work_arrangement IS NULL
          AND crew_organisation IS NULL
          AND crew_lead_name IS NULL
          AND crew_lead_phone IS NULL
        )
        OR (
          category = 'crew'
          AND crew_work_arrangement IS NOT NULL
          AND crew_work_arrangement = 'organisation'
          AND crew_organisation IS NOT NULL
          AND crew_lead_name IS NOT NULL
          AND crew_lead_phone IS NOT NULL
          AND length(btrim(crew_organisation)) BETWEEN 2 AND 255
          AND length(btrim(crew_lead_name)) BETWEEN 2 AND 255
          AND crew_lead_phone ~ '^[0-9]{10}$'
        )
        OR (
          category = 'crew'
          AND crew_work_arrangement = 'independent'
          AND crew_organisation IS NULL
          AND crew_lead_name IS NULL
          AND crew_lead_phone IS NULL
        )
      );
  END IF;
END $$;
