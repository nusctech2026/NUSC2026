-- Keep legacy press applications private and make matchday credentials span
-- the configured campaign calendar without weakening per-match assignment.

ALTER TABLE public.press_accreditations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon insert press_accreditations" ON public.press_accreditations;
DROP POLICY IF EXISTS "Allow service role all press_accreditations" ON public.press_accreditations;
REVOKE ALL ON TABLE public.press_accreditations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.press_accreditations TO service_role;
CREATE POLICY "Allow service role all press_accreditations"
  ON public.press_accreditations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Legacy upload URLs contain sensitive identity documents. Keep the existing
-- objects and paths, but stop public access even if another permissive storage
-- policy is present. The service role remains able to sign authorized URLs.
UPDATE storage.buckets SET public = false WHERE id = 'press_documents';
DROP POLICY IF EXISTS press_documents_private_access ON storage.objects;
CREATE POLICY press_documents_private_access
  ON storage.objects AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (bucket_id <> 'press_documents')
  WITH CHECK (bucket_id <> 'press_documents');

-- Correct display names in place; role codes and referenced role IDs remain
-- stable for existing workforce applications.
UPDATE public.campaign_roles
SET name = 'Other', updated_at = clock_timestamp()
WHERE right(code, 7) = '_others' AND name = 'Others';

UPDATE public.campaign_roles
SET name = 'Match Official',
    description = 'Matchday official oversight and coordination',
    updated_at = clock_timestamp()
WHERE code = 'official_match_commissioner' AND name = 'Match Commissioner';

DO $$
DECLARE
  function_definition TEXT;
BEGIN
  function_definition := pg_get_functiondef(
    'public.record_campaign_attendance_scan(text,text,text,text,uuid,text)'::regprocedure
  );
  EXECUTE replace(function_definition, 'Others: ', 'Other: ');

  function_definition := pg_get_functiondef(
    'public.verify_and_check_in_campaign_id(text,text,text,uuid)'::regprocedure
  );
  EXECUTE replace(function_definition, 'Others: ', 'Other: ');
END
$$;

-- Attendance is an audit record. Referenced applications, credentials, and
-- match definitions cannot be deleted while history points to them.
ALTER TABLE public.campaign_attendance
  DROP CONSTRAINT IF EXISTS campaign_attendance_application_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_attendance_campaign_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_attendance_event_id_fkey;
ALTER TABLE public.campaign_attendance
  ADD CONSTRAINT campaign_attendance_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.campaign_applications(id) ON DELETE RESTRICT,
  ADD CONSTRAINT campaign_attendance_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaign_ids(id) ON DELETE RESTRICT,
  ADD CONSTRAINT campaign_attendance_event_id_fkey
    FOREIGN KEY (event_id) REFERENCES public.campaign_events(id) ON DELETE RESTRICT;

-- Replace the service-only workflow RPC with a database-side role check. The
-- actor UUID is supplied from a server-verified staff session, then resolved
-- against user_roles and auth.users here before any status change is allowed.
DROP FUNCTION IF EXISTS public.review_campaign_application(UUID, TEXT, TEXT, TEXT);
CREATE FUNCTION public.review_campaign_application(
  p_application_id UUID,
  p_status TEXT,
  p_actor_user_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app public.campaign_applications%ROWTYPE;
  v_actor_role TEXT;
  v_actor_email TEXT;
  v_is_manager BOOLEAN;
  v_valid_until TIMESTAMPTZ;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_pass JSONB;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid application status';
  END IF;
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated campaign staff identity is required';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id = p_actor_user_id
    AND role IN ('super_admin', 'campaign_manager', 'reviewer')
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign reviewer or manager role is required';
  END IF;
  v_is_manager := v_actor_role IN ('super_admin', 'campaign_manager');

  SELECT NULLIF(trim(email), '') INTO v_actor_email
  FROM auth.users WHERE id = p_actor_user_id;
  IF v_actor_email IS NULL THEN
    RAISE EXCEPTION 'Authenticated campaign staff account is unavailable';
  END IF;

  SELECT * INTO v_app
  FROM public.campaign_applications
  WHERE id = p_application_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Applicant not found';
  END IF;

  IF NOT v_is_manager AND (
    v_app.application_status = 'approved'
    OR p_status NOT IN ('under_review', 'waitlisted', 'rejected')
    OR v_app.application_status NOT IN ('submitted', 'under_review', 'waitlisted')
  ) THEN
    RAISE EXCEPTION 'Reviewers cannot make this application status change';
  END IF;

  UPDATE public.campaign_applications
  SET application_status = p_status,
      assigned_role_id = CASE WHEN p_status = 'approved' THEN COALESCE(assigned_role_id, preferred_role_id) ELSE assigned_role_id END,
      admin_notes = COALESCE(p_notes, admin_notes),
      reviewed_at = v_now,
      reviewed_by = v_actor_email,
      updated_at = v_now
  WHERE id = p_application_id;

  IF p_status = 'approved' THEN
    SELECT GREATEST(
      v_now + interval '90 days',
      CASE WHEN v_app.event_id IS NOT NULL THEN
        (SELECT event.end_date FROM public.campaign_events AS event WHERE event.id = v_app.event_id)
      ELSE
        (SELECT max(event.end_date) FROM public.campaign_events AS event WHERE event.is_active)
      END
    ) INTO v_valid_until;

    -- The issuer computes this same schedule-aware expiry. Review remains
    -- atomic so the application cannot be approved without its credential.
    v_pass := public.issue_campaign_id(p_application_id, v_actor_email);
    UPDATE public.campaign_ids
    SET valid_until = GREATEST(valid_until, v_valid_until), updated_at = v_now
    WHERE application_id = p_application_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'credential', v_pass);
END
$$;

REVOKE ALL ON FUNCTION public.review_campaign_application(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campaign_application(UUID, TEXT, UUID, TEXT) TO service_role;

-- Existing active credentials get the configured final match date. New and
-- reissued credentials use the same calculation in issue_campaign_id below.
UPDATE public.campaign_ids AS credential
SET valid_until = GREATEST(
      credential.valid_until,
      CASE WHEN application.event_id IS NOT NULL THEN
        COALESCE((SELECT event.end_date FROM public.campaign_events AS event WHERE event.id = application.event_id), credential.valid_until)
      ELSE
        COALESCE((SELECT max(event.end_date) FROM public.campaign_events AS event WHERE event.is_active), credential.valid_until)
      END
    ),
    updated_at = clock_timestamp()
FROM public.campaign_applications AS application
WHERE application.id = credential.application_id
  AND credential.is_active
  AND credential.revoked_at IS NULL
  AND application.application_status = 'approved';

CREATE OR REPLACE FUNCTION public.issue_campaign_id(
  p_application_id UUID, p_actor TEXT, p_reissue BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_app public.campaign_applications%ROWTYPE;
  v_id public.campaign_ids%ROWTYPE;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_valid_until TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_app FROM public.campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.application_status <> 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_roles
    WHERE id = v_app.assigned_role_id AND category = v_app.category AND is_active
  ) THEN
    RAISE EXCEPTION 'Assign an active role in the applicant category first';
  END IF;

  SELECT GREATEST(
    v_now + interval '90 days',
    CASE WHEN v_app.event_id IS NOT NULL THEN
      (SELECT event.end_date FROM public.campaign_events AS event WHERE event.id = v_app.event_id)
    ELSE
      (SELECT max(event.end_date) FROM public.campaign_events AS event WHERE event.is_active)
    END
  ) INTO v_valid_until;

  SELECT * INTO v_id FROM public.campaign_ids WHERE application_id = p_application_id FOR UPDATE;
  IF FOUND AND NOT p_reissue THEN
    UPDATE public.campaign_ids
    SET valid_until = GREATEST(valid_until, v_valid_until), updated_at = v_now
    WHERE id = v_id.id RETURNING * INTO v_id;
    RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
  END IF;
  IF FOUND THEN
    UPDATE public.campaign_ids
    SET pass_slug = encode(extensions.gen_random_bytes(16), 'hex'),
        qr_token = encode(extensions.gen_random_bytes(32), 'hex'),
        issued_at = v_now, issued_by = p_actor, valid_from = v_now, valid_until = v_valid_until,
        is_active = true, revoked_at = NULL, revoked_by = NULL, updated_at = v_now
    WHERE id = v_id.id RETURNING * INTO v_id;
  ELSE
    INSERT INTO public.campaign_ids (application_id, id_number, issued_by, valid_until)
    VALUES (
      p_application_id,
      'NUSC-ID-' || to_char(v_now, 'YYYY') || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex')),
      p_actor,
      v_valid_until
    ) RETURNING * INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
END
$$;

REVOKE ALL ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) TO service_role;

CREATE OR REPLACE FUNCTION public.extend_campaign_credentials_to_match_end()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.campaign_ids AS credential
  SET valid_until = GREATEST(credential.valid_until, NEW.end_date),
      updated_at = clock_timestamp()
  FROM public.campaign_applications AS application
  WHERE application.id = credential.application_id
    AND application.application_status = 'approved'
    AND credential.is_active
    AND credential.revoked_at IS NULL
    AND NEW.is_active
    AND (application.event_id IS NULL OR application.event_id = NEW.id);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS campaign_event_extend_credentials ON public.campaign_events;
CREATE TRIGGER campaign_event_extend_credentials
  AFTER INSERT OR UPDATE ON public.campaign_events
  FOR EACH ROW EXECUTE FUNCTION public.extend_campaign_credentials_to_match_end();

COMMIT;
