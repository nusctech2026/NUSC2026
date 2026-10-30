-- Store the private object path for the supporting document submitted by Press and Media applicants.
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS media_authorisation_storage_path TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_applications_media_authorisation_path
  ON public.campaign_applications (media_authorisation_storage_path)
  WHERE media_authorisation_storage_path IS NOT NULL;

UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png']::TEXT[]
WHERE id = 'campaign_documents';
