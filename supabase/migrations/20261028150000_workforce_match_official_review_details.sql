-- Capture the additional details needed to review Match Officials applicants.
-- campaign_applications is protected by its existing RLS and service-role access model.
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS professional_experience TEXT,
  ADD COLUMN IF NOT EXISTS conflict_of_interest BOOLEAN,
  ADD COLUMN IF NOT EXISTS conflict_details TEXT,
  ADD COLUMN IF NOT EXISTS official_credential_storage_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_applications_official_credential_path
  ON public.campaign_applications (official_credential_storage_path)
  WHERE official_credential_storage_path IS NOT NULL;
