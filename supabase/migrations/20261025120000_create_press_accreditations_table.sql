-- Create press_accreditations table for Nagaland United Sports Club
-- Official Press & Media Accreditation registrations for Home Matches at Chümoukedima Football Stadium

CREATE TABLE IF NOT EXISTS public.press_accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accreditation_id VARCHAR(64) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  residential_address TEXT NOT NULL,
  photo_filename TEXT,
  photo_url TEXT,
  govt_id_filename TEXT,
  govt_id_url TEXT,
  media_org_name VARCHAR(255) NOT NULL,
  media_org_type VARCHAR(100) NOT NULL,
  media_org_type_other VARCHAR(255),
  designation_role VARCHAR(100) NOT NULL,
  designation_role_other VARCHAR(255),
  media_website_url TEXT,
  media_id_letter_filename TEXT,
  media_id_letter_url TEXT,
  accreditation_type VARCHAR(50) NOT NULL,
  single_match_details VARCHAR(255),
  access_required JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_carried JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment_other VARCHAR(255),
  terms_accepted BOOLEAN NOT NULL DEFAULT true,
  consent_given BOOLEAN NOT NULL DEFAULT true,
  applicant_signature_name VARCHAR(255) NOT NULL,
  declaration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  approved_access_areas JSONB DEFAULT '[]'::jsonb,
  validity VARCHAR(100) DEFAULT 'Season 2026–27',
  authorised_by VARCHAR(255) DEFAULT 'NUSC Media Department',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.press_accreditations ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated to insert their own applications
DROP POLICY IF EXISTS "Allow anon insert press_accreditations" ON public.press_accreditations;
CREATE POLICY "Allow anon insert press_accreditations" 
  ON public.press_accreditations 
  FOR INSERT 
  WITH CHECK (true);

-- Service role can read and update all
DROP POLICY IF EXISTS "Allow service role all press_accreditations" ON public.press_accreditations;
CREATE POLICY "Allow service role all press_accreditations" 
  ON public.press_accreditations 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_press_accreditations_accred_id ON public.press_accreditations (accreditation_id);
CREATE INDEX IF NOT EXISTS idx_press_accreditations_email ON public.press_accreditations (email);
CREATE INDEX IF NOT EXISTS idx_press_accreditations_status ON public.press_accreditations (status);

-- Payload CMS relationship support for locked documents
ALTER TABLE IF EXISTS public.payload_locked_documents_rels 
  ADD COLUMN IF NOT EXISTS press_accreditations_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payload_locked_documents_rels_press_accreditations_fk'
  ) THEN
    ALTER TABLE public.payload_locked_documents_rels 
      ADD CONSTRAINT payload_locked_documents_rels_press_accreditations_fk 
      FOREIGN KEY (press_accreditations_id) 
      REFERENCES public.press_accreditations(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_press_accreditations_id_idx 
  ON public.payload_locked_documents_rels USING btree (press_accreditations_id);

