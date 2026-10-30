-- Harden new workforce submissions while keeping historical registrations intact.
-- Apply after migrations 20261028110000 through 20261028160000.

DO $$
DECLARE
  v_missing_columns TEXT[];
BEGIN
  SELECT array_agg(required.column_name ORDER BY required.column_name)
  INTO v_missing_columns
  FROM unnest(ARRAY[
    'availability_mode', 'availability_match_ids', 'media_outlet', 'media_organisation_type',
    'portfolio_url', 'media_access_types', 'media_authorisation_storage_path',
    'professional_body', 'professional_qualification', 'professional_registration_number',
    'professional_experience', 'conflict_of_interest', 'conflict_details',
    'official_credential_storage_path', 'technical_specialty', 'crew_work_arrangement',
    'crew_organisation', 'crew_lead_name', 'crew_lead_phone'
  ]::TEXT[]) AS required(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns AS existing
    WHERE existing.table_schema = 'public'
      AND existing.table_name = 'campaign_applications'
      AND existing.column_name = required.column_name
  );

  IF v_missing_columns IS NOT NULL THEN
    RAISE EXCEPTION
      'Apply workforce migrations 20261028110000 through 20261028160000 before this migration. Missing campaign_applications columns: %',
      array_to_string(v_missing_columns, ', ');
  END IF;
END $$;

ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS idempotency_key UUID,
  ADD COLUMN IF NOT EXISTS idempotency_request_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS campaign_applications_idempotency_key_uidx
  ON public.campaign_applications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_idempotency_hash_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
    ALTER TABLE public.campaign_applications
      ADD CONSTRAINT campaign_applications_idempotency_hash_check CHECK (
        (idempotency_key IS NULL AND idempotency_request_hash IS NULL)
        OR (
          idempotency_key IS NOT NULL
          AND idempotency_request_hash IS NOT NULL
          AND idempotency_request_hash ~ '^[0-9a-f]{64}$'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'campaign_applications_new_submission_integrity_check'
      AND conrelid = 'public.campaign_applications'::regclass
  ) THEN
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
              AND designation IS NOT NULL AND length(btrim(designation)) BETWEEN 2 AND 255
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
  END IF;
END $$;

-- One claim per normalized phone number and email. Seed the earliest existing
-- application for each identity so old duplicates remain intact but cannot be
-- used to create another registration.
CREATE TABLE IF NOT EXISTS public.workforce_registration_identity_claims (
  identity_kind TEXT NOT NULL CHECK (identity_kind IN ('phone', 'email')),
  normalized_value VARCHAR(255) NOT NULL CHECK (length(normalized_value) BETWEEN 1 AND 255),
  application_id UUID NOT NULL REFERENCES public.campaign_applications(id) ON DELETE NO ACTION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workforce_registration_identity_claims_pkey PRIMARY KEY (identity_kind, normalized_value),
  CONSTRAINT workforce_registration_identity_claims_application_kind_key UNIQUE (identity_kind, application_id)
);

ALTER TABLE public.workforce_registration_identity_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workforce_registration_identity_claims FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.workforce_registration_identity_claims TO service_role;

CREATE OR REPLACE FUNCTION public.normalize_workforce_phone(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT CASE
    WHEN length(regexp_replace(COALESCE(p_value, ''), '[^0-9]', '', 'g')) = 12
      AND left(regexp_replace(COALESCE(p_value, ''), '[^0-9]', '', 'g'), 2) = '91'
    THEN right(regexp_replace(COALESCE(p_value, ''), '[^0-9]', '', 'g'), 10)
    ELSE regexp_replace(COALESCE(p_value, ''), '[^0-9]', '', 'g')
  END
$$;

REVOKE ALL ON FUNCTION public.normalize_workforce_phone(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_workforce_phone(TEXT) TO service_role;

WITH normalized_identities AS (
  SELECT id AS application_id, 'phone'::TEXT AS identity_kind,
         public.normalize_workforce_phone(phone) AS normalized_value, submitted_at
  FROM public.campaign_applications
  WHERE phone IS NOT NULL
  UNION ALL
  SELECT id, 'email'::TEXT, lower(btrim(email)), submitted_at
  FROM public.campaign_applications
  WHERE email IS NOT NULL
), first_claim AS (
  SELECT DISTINCT ON (identity_kind, normalized_value)
         identity_kind, normalized_value, application_id
  FROM normalized_identities
  WHERE normalized_value <> ''
  ORDER BY identity_kind, normalized_value, submitted_at, application_id
)
INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
SELECT identity_kind, normalized_value, application_id
FROM first_claim
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.claim_workforce_registration_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_old_phone TEXT;
  v_new_phone TEXT;
  v_old_email TEXT;
  v_new_email TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new_phone := public.normalize_workforce_phone(NEW.phone);
    v_new_email := lower(btrim(COALESCE(NEW.email, '')));
    IF v_new_phone <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      VALUES ('phone', v_new_phone, NEW.id);
    END IF;
    IF v_new_email <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      VALUES ('email', v_new_email, NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  v_old_phone := public.normalize_workforce_phone(OLD.phone);
  v_new_phone := public.normalize_workforce_phone(NEW.phone);
  v_old_email := lower(btrim(COALESCE(OLD.email, '')));
  v_new_email := lower(btrim(COALESCE(NEW.email, '')));

  IF v_old_phone IS DISTINCT FROM v_new_phone THEN
    DELETE FROM public.workforce_registration_identity_claims
    WHERE identity_kind = 'phone' AND normalized_value = v_old_phone AND application_id = OLD.id;
    IF v_old_phone <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      SELECT 'phone', v_old_phone, existing.id
      FROM public.campaign_applications AS existing
      WHERE existing.id <> NEW.id
        AND public.normalize_workforce_phone(existing.phone) = v_old_phone
      ORDER BY existing.submitted_at, existing.id
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_new_phone <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      VALUES ('phone', v_new_phone, NEW.id);
    END IF;
  END IF;

  IF v_old_email IS DISTINCT FROM v_new_email THEN
    DELETE FROM public.workforce_registration_identity_claims
    WHERE identity_kind = 'email' AND normalized_value = v_old_email AND application_id = OLD.id;
    IF v_old_email <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      SELECT 'email', v_old_email, existing.id
      FROM public.campaign_applications AS existing
      WHERE existing.id <> NEW.id
        AND lower(btrim(COALESCE(existing.email, ''))) = v_old_email
      ORDER BY existing.submitted_at, existing.id
      LIMIT 1
      ON CONFLICT DO NOTHING;
    END IF;
    IF v_new_email <> '' THEN
      INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
      VALUES ('email', v_new_email, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_workforce_registration_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_phone TEXT := public.normalize_workforce_phone(OLD.phone);
  v_email TEXT := lower(btrim(COALESCE(OLD.email, '')));
BEGIN
  IF v_phone <> '' THEN
    DELETE FROM public.workforce_registration_identity_claims
    WHERE identity_kind = 'phone' AND normalized_value = v_phone AND application_id = OLD.id;
    INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
    SELECT 'phone', v_phone, existing.id
    FROM public.campaign_applications AS existing
    WHERE existing.id <> OLD.id
      AND public.normalize_workforce_phone(existing.phone) = v_phone
    ORDER BY existing.submitted_at, existing.id
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
  IF v_email <> '' THEN
    DELETE FROM public.workforce_registration_identity_claims
    WHERE identity_kind = 'email' AND normalized_value = v_email AND application_id = OLD.id;
    INSERT INTO public.workforce_registration_identity_claims (identity_kind, normalized_value, application_id)
    SELECT 'email', v_email, existing.id
    FROM public.campaign_applications AS existing
    WHERE existing.id <> OLD.id
      AND lower(btrim(COALESCE(existing.email, ''))) = v_email
    ORDER BY existing.submitted_at, existing.id
    LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS campaign_application_claim_identity_insert ON public.campaign_applications;
CREATE TRIGGER campaign_application_claim_identity_insert
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.claim_workforce_registration_identity();

DROP TRIGGER IF EXISTS campaign_application_claim_identity_update ON public.campaign_applications;
CREATE TRIGGER campaign_application_claim_identity_update
  AFTER UPDATE OF phone, email ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.claim_workforce_registration_identity();

DROP TRIGGER IF EXISTS campaign_application_release_identity ON public.campaign_applications;
CREATE TRIGGER campaign_application_release_identity
  BEFORE DELETE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.release_workforce_registration_identity();

REVOKE ALL ON FUNCTION public.claim_workforce_registration_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_workforce_registration_identity() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workforce_registration_identity() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_workforce_registration_identity() TO service_role;

-- Repeat role and availability eligibility checks at the database boundary too.
CREATE OR REPLACE FUNCTION public.validate_new_workforce_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_role_category TEXT;
  v_role_active BOOLEAN;
BEGIN
  IF NEW.idempotency_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.preferred_role_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.campaign_roles WHERE category = NEW.category AND is_active) THEN
      RAISE EXCEPTION 'An active role must be selected for this department'
        USING ERRCODE = '23514', CONSTRAINT = 'campaign_applications_selected_role_check';
    END IF;
  ELSE
    SELECT category, is_active INTO v_role_category, v_role_active
    FROM public.campaign_roles WHERE id = NEW.preferred_role_id;
    IF NOT FOUND OR v_role_category <> NEW.category OR NOT v_role_active THEN
      RAISE EXCEPTION 'The selected role is unavailable'
        USING ERRCODE = '23514', CONSTRAINT = 'campaign_applications_selected_role_check';
    END IF;
  END IF;

  IF NEW.availability_mode = 'selected' AND EXISTS (
    SELECT 1
    FROM unnest(NEW.availability_match_ids) AS selected(match_id)
    LEFT JOIN public.campaign_events AS event ON event.id = selected.match_id AND event.is_active
    WHERE event.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A selected match is unavailable'
      USING ERRCODE = '23514', CONSTRAINT = 'campaign_applications_active_matches_check';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_application_validate_new_workforce ON public.campaign_applications;
CREATE TRIGGER campaign_application_validate_new_workforce
  BEFORE INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_new_workforce_registration();
REVOKE ALL ON FUNCTION public.validate_new_workforce_registration() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_new_workforce_registration() TO service_role;

-- Keep useful audit events while storing only changed field names, never old/new
-- contact details, credentials, or document paths.
CREATE OR REPLACE FUNCTION public.audit_campaign_application_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_before JSONB;
  v_after JSONB;
  v_changes JSONB;
BEGIN
  v_before := to_jsonb(OLD) - ARRAY['updated_at', 'last_updated_by', 'reviewed_at', 'reviewed_by'];
  v_after := to_jsonb(NEW) - ARRAY['updated_at', 'last_updated_by', 'reviewed_at', 'reviewed_by'];
  SELECT COALESCE(jsonb_object_agg(field_name, TRUE), '{}'::JSONB)
  INTO v_changes
  FROM jsonb_object_keys(v_after) AS fields(field_name)
  WHERE v_before -> field_name IS DISTINCT FROM v_after -> field_name;

  IF v_changes <> '{}'::JSONB THEN
    INSERT INTO public.campaign_application_change_history (application_id, changed_by, changed_fields)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.last_updated_by, ''), NULLIF(NEW.reviewed_by, ''), 'system'),
      v_changes
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_workforce_registration_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  INSERT INTO public.campaign_application_change_history (application_id, changed_by, changed_fields)
  VALUES (
    NEW.id,
    'public_registration',
    jsonb_build_object('event', 'registration_submitted', 'department', NEW.category)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS campaign_application_registration_audit ON public.campaign_applications;
CREATE TRIGGER campaign_application_registration_audit
  AFTER INSERT ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.audit_workforce_registration_submission();

REVOKE ALL ON FUNCTION public.audit_campaign_application_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_workforce_registration_submission() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.audit_campaign_application_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.audit_workforce_registration_submission() TO service_role;
