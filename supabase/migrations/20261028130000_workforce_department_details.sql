-- Store applicant scheduling preferences and the additional details needed for
-- media, technical crew, match-official, and medical review.
-- campaign_applications already has RLS enabled and is service-role-only.
ALTER TABLE public.campaign_applications
  ALTER COLUMN preferred_role_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS availability_mode TEXT NOT NULL DEFAULT 'unsure',
  ADD COLUMN IF NOT EXISTS availability_match_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS media_outlet VARCHAR(255),
  ADD COLUMN IF NOT EXISTS media_organisation_type TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS media_access_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS professional_body VARCHAR(255),
  ADD COLUMN IF NOT EXISTS professional_qualification VARCHAR(255),
  ADD COLUMN IF NOT EXISTS professional_registration_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS technical_specialty VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_availability_mode_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_availability_mode_check
      CHECK (availability_mode IN ('all', 'selected', 'unsure'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_availability_selection_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_availability_selection_check
      CHECK (
        (availability_mode = 'selected' AND cardinality(availability_match_ids) BETWEEN 1 AND 10)
        OR (availability_mode IN ('all', 'unsure') AND cardinality(availability_match_ids) = 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_media_access_types_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_media_access_types_check
      CHECK (
        cardinality(media_access_types) <= 5
        AND media_access_types <@ ARRAY[
          'media_press_seating',
          'photography_area',
          'press_conference_area',
          'mixed_zone_interview_area',
          'broadcast_video_coverage_area'
        ]::TEXT[]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_media_organisation_type_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_media_organisation_type_check
      CHECK (
        media_organisation_type IS NULL
        OR media_organisation_type IN (
          'kaki',
          'print_media',
          'press_media',
          'broadcast_tv',
          'digital_online_media',
          'independent_freelance',
          'other'
        )
      );
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_campaign_applications_availability_match_ids
  ON public.campaign_applications USING GIN (availability_match_ids);
