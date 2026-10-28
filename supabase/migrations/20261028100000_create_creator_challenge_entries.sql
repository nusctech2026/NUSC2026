-- Public NUSC Creator Challenge submissions. Public writes go through the
-- validated web server action; direct client access is intentionally denied.
CREATE TABLE IF NOT EXISTS public.creator_challenge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  creator_handle VARCHAR(100),
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  age_group VARCHAR(20) NOT NULL CHECK (age_group IN ('under_18', '18_24', '25_34', '35_44', '45_plus')),
  location VARCHAR(160) NOT NULL,
  category VARCHAR(24) NOT NULL CHECK (category IN ('poster', 'football_edits', 'fan_voice')),
  matchday_number SMALLINT NOT NULL CHECK (matchday_number BETWEEN 1 AND 10),
  publishing_platform VARCHAR(32) NOT NULL CHECK (publishing_platform IN ('instagram', 'youtube', 'facebook', 'x', 'other')),
  public_profile_url TEXT NOT NULL,
  entry_title_description VARCHAR(300) NOT NULL,
  published_entry_url TEXT NOT NULL,
  published_entry_url_key TEXT NOT NULL,
  campaign_hashtag VARCHAR(66) NOT NULL,
  additional_notes VARCHAR(1000),
  guardian_consent BOOLEAN NOT NULL DEFAULT false,
  declaration_original_work BOOLEAN NOT NULL,
  declaration_rights_permissions BOOLEAN NOT NULL,
  declaration_rules_conduct BOOLEAN NOT NULL,
  declaration_content_licence BOOLEAN NOT NULL,
  declaration_accuracy_respect BOOLEAN NOT NULL,
  declaration_contact_verification BOOLEAN NOT NULL,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT creator_challenge_minor_consent CHECK (age_group <> 'under_18' OR guardian_consent = true),
  CONSTRAINT creator_challenge_declarations_confirmed CHECK (
    declaration_original_work
    AND declaration_rights_permissions
    AND declaration_rules_conduct
    AND declaration_content_licence
    AND declaration_accuracy_respect
    AND declaration_contact_verification
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS creator_challenge_entries_matchday_email_uidx
  ON public.creator_challenge_entries (matchday_number, category, lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS creator_challenge_entries_matchday_url_uidx
  ON public.creator_challenge_entries (matchday_number, published_entry_url_key);

CREATE INDEX IF NOT EXISTS creator_challenge_entries_submitted_idx
  ON public.creator_challenge_entries (submitted_at DESC);

CREATE INDEX IF NOT EXISTS creator_challenge_entries_category_matchday_idx
  ON public.creator_challenge_entries (category, matchday_number, submitted_at DESC);

ALTER TABLE public.creator_challenge_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_challenge_entries FROM anon, authenticated;
GRANT ALL ON TABLE public.creator_challenge_entries TO service_role;

-- This is a new table, so create its policy once without dropping any existing policy.
CREATE POLICY "Service role all creator challenge entries"
  ON public.creator_challenge_entries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
