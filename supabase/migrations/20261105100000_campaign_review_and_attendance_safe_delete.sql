BEGIN;

-- Preserve attendance evidence independently from a registration that an
-- authorized administrator deliberately deletes.
ALTER TABLE public.campaign_attendance
  ADD COLUMN IF NOT EXISTS application_id_snapshot UUID,
  ADD COLUMN IF NOT EXISTS application_number_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS campaign_id_snapshot UUID,
  ADD COLUMN IF NOT EXISTS id_number_snapshot VARCHAR(64);

UPDATE public.campaign_attendance AS attendance
SET application_id_snapshot = COALESCE(attendance.application_id_snapshot, attendance.application_id),
    application_number_snapshot = COALESCE(
      attendance.application_number_snapshot,
      (SELECT application.application_number
       FROM public.campaign_applications AS application
       WHERE application.id = attendance.application_id)
    ),
    campaign_id_snapshot = COALESCE(attendance.campaign_id_snapshot, attendance.campaign_id),
    id_number_snapshot = COALESCE(
      attendance.id_number_snapshot,
      (SELECT credential.id_number
       FROM public.campaign_ids AS credential
       WHERE credential.id = attendance.campaign_id)
    )
WHERE attendance.application_id IS NOT NULL
   OR attendance.campaign_id IS NOT NULL;

ALTER TABLE public.campaign_attendance
  ALTER COLUMN application_id DROP NOT NULL,
  ALTER COLUMN campaign_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS campaign_attendance_application_id_fkey,
  DROP CONSTRAINT IF EXISTS campaign_attendance_campaign_id_fkey,
  ADD CONSTRAINT campaign_attendance_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.campaign_applications(id) ON DELETE SET NULL,
  ADD CONSTRAINT campaign_attendance_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaign_ids(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.snapshot_campaign_attendance_before_application_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  UPDATE public.campaign_attendance AS attendance
  SET application_id_snapshot = COALESCE(attendance.application_id_snapshot, OLD.id),
      application_number_snapshot = COALESCE(attendance.application_number_snapshot, OLD.application_number)
  WHERE attendance.application_id = OLD.id;

  UPDATE public.campaign_attendance AS attendance
  SET campaign_id_snapshot = COALESCE(attendance.campaign_id_snapshot, attendance.campaign_id),
      id_number_snapshot = COALESCE(attendance.id_number_snapshot, credential.id_number)
  FROM public.campaign_ids AS credential
  WHERE attendance.application_id = OLD.id
    AND attendance.campaign_id = credential.id
    AND credential.application_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS campaign_application_snapshot_attendance_delete ON public.campaign_applications;
CREATE TRIGGER campaign_application_snapshot_attendance_delete
  BEFORE DELETE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_campaign_attendance_before_application_delete();

REVOKE ALL ON FUNCTION public.snapshot_campaign_attendance_before_application_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_campaign_attendance_before_application_delete() TO service_role;

-- Compare identities as text so this remains safe with either UUID or
-- varchar user_roles.user_id schemas. Rejection/cancellation revokes any
-- active credential; reapproval issues a new QR token.
CREATE OR REPLACE FUNCTION public.review_campaign_application(
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
  v_reissue BOOLEAN := FALSE;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid application status';
  END IF;
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated campaign staff identity is required';
  END IF;

  SELECT role INTO v_actor_role
  FROM public.user_roles
  WHERE user_id::TEXT = p_actor_user_id::TEXT
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
    SELECT EXISTS (
      SELECT 1 FROM public.campaign_ids
      WHERE application_id = p_application_id
        AND (NOT is_active OR revoked_at IS NOT NULL)
    ) INTO v_reissue;

    SELECT GREATEST(
      v_now + interval '90 days',
      CASE WHEN v_app.event_id IS NOT NULL THEN
        (SELECT event.end_date FROM public.campaign_events AS event WHERE event.id = v_app.event_id)
      ELSE
        (SELECT max(event.end_date) FROM public.campaign_events AS event WHERE event.is_active)
      END
    ) INTO v_valid_until;

    v_pass := public.issue_campaign_id(p_application_id, v_actor_email, v_reissue);
    UPDATE public.campaign_ids
    SET valid_until = GREATEST(valid_until, v_valid_until), updated_at = v_now
    WHERE application_id = p_application_id;
  ELSE
    UPDATE public.campaign_ids
    SET is_active = FALSE,
        revoked_at = COALESCE(revoked_at, v_now),
        revoked_by = COALESCE(revoked_by, v_actor_email),
        updated_at = v_now
    WHERE application_id = p_application_id
      AND (is_active OR revoked_at IS NULL);
  END IF;

  RETURN jsonb_build_object('success', true, 'credential', v_pass);
END
$$;

REVOKE ALL ON FUNCTION public.review_campaign_application(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_campaign_application(UUID, TEXT, UUID, TEXT) TO service_role;

COMMIT;
