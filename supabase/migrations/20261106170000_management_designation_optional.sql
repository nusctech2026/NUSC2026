BEGIN;

-- Management applicants identify their organisation or affiliation. Their
-- designation field is intentionally absent from the public form and must not
-- be required by the registration integrity constraint.
ALTER TABLE public.campaign_applications
  DROP CONSTRAINT IF EXISTS campaign_applications_new_submission_integrity_check;

ALTER TABLE public.campaign_applications
  ADD CONSTRAINT campaign_applications_new_submission_integrity_check CHECK (
    idempotency_key IS NULL OR (
      idempotency_request_hash IS NOT NULL
      AND length(btrim(full_name)) BETWEEN 2 AND 255
      AND phone ~ '^[0-9]{10}$'
      AND email IS NOT NULL
      AND email = lower(btrim(email))
      AND length(email) BETWEEN 3 AND 255
      AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      AND category IN ('ahibi', 'volunteer', 'media', 'crew', 'management', 'officials', 'medical')
      AND availability_mode IN ('all', 'selected')
      AND (
        (availability_mode = 'selected' AND cardinality(availability_match_ids) BETWEEN 1 AND 10)
        OR (availability_mode = 'all' AND cardinality(availability_match_ids) = 0)
      )
      AND terms_accepted_at IS NOT NULL
      AND CASE category
        WHEN 'media' THEN
          media_outlet IS NOT NULL AND length(btrim(media_outlet)) BETWEEN 2 AND 255
          AND media_organisation_type IS NOT NULL
          AND designation IS NOT NULL AND length(btrim(designation)) BETWEEN 2 AND 255
          AND cardinality(media_access_types) BETWEEN 1 AND 5
          AND media_authorisation_storage_path IS NOT NULL
        WHEN 'officials' THEN
          professional_body IS NOT NULL AND length(btrim(professional_body)) BETWEEN 2 AND 255
          AND professional_qualification IS NOT NULL AND length(btrim(professional_qualification)) BETWEEN 2 AND 255
          AND professional_experience IS NOT NULL AND length(btrim(professional_experience)) BETWEEN 2 AND 2000
          AND conflict_of_interest IS NOT NULL
          AND ((conflict_of_interest AND conflict_details IS NOT NULL AND length(btrim(conflict_details)) BETWEEN 2 AND 2000)
            OR (NOT conflict_of_interest AND conflict_details IS NULL))
        WHEN 'medical' THEN
          professional_qualification IS NOT NULL AND length(btrim(professional_qualification)) BETWEEN 2 AND 255
        WHEN 'management' THEN
          organisation IS NOT NULL AND length(btrim(organisation)) BETWEEN 2 AND 255
          AND ((organisation = 'Others' AND organisation_other IS NOT NULL AND length(btrim(organisation_other)) BETWEEN 2 AND 255)
            OR (organisation <> 'Others' AND organisation_other IS NULL))
        WHEN 'crew' THEN
          crew_work_arrangement IS NOT NULL
          AND crew_work_arrangement IN ('organisation', 'independent')
          AND ((crew_work_arrangement = 'organisation'
            AND crew_organisation IS NOT NULL AND length(btrim(crew_organisation)) BETWEEN 2 AND 255
            AND crew_lead_name IS NOT NULL AND length(btrim(crew_lead_name)) BETWEEN 2 AND 255
            AND crew_lead_phone ~ '^[0-9]{10}$')
            OR (crew_work_arrangement = 'independent'
              AND crew_organisation IS NULL AND crew_lead_name IS NULL AND crew_lead_phone IS NULL))
          AND (technical_specialty IS NULL OR length(technical_specialty) <= 255)
          AND (experience IS NULL OR length(experience) <= 2000)
        ELSE TRUE
      END
    )
  );

COMMIT;
