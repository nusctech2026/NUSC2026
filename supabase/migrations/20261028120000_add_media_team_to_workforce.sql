-- Add Media Team to the shared seven-department registration and accreditation flow.

ALTER TABLE public.campaign_roles
  DROP CONSTRAINT IF EXISTS campaign_roles_category_check;
ALTER TABLE public.campaign_roles
  ADD CONSTRAINT campaign_roles_category_check
  CHECK (category IN ('ahibi', 'volunteer', 'media', 'crew', 'management', 'officials', 'medical'));

ALTER TABLE public.campaign_applications
  DROP CONSTRAINT IF EXISTS campaign_applications_category_check;
ALTER TABLE public.campaign_applications
  ADD CONSTRAINT campaign_applications_category_check
  CHECK (category IN ('ahibi', 'volunteer', 'media', 'crew', 'management', 'officials', 'medical'));

INSERT INTO public.campaign_roles (category, name, code, description) VALUES
  ('media', 'Kaki', 'media_kaki', 'Media team matchday role'),
  ('media', 'Print Media', 'media_print', 'Print media coverage'),
  ('media', 'Press Media', 'media_press', 'Press media coverage')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_workforce_registration_id(p_department TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_prefix TEXT;
  v_number BIGINT;
BEGIN
  v_prefix := CASE p_department
    WHEN 'ahibi' THEN 'AHB'
    WHEN 'volunteer' THEN 'VOL'
    WHEN 'media' THEN 'MED'
    WHEN 'crew' THEN 'CRW'
    WHEN 'management' THEN 'MGT'
    WHEN 'officials' THEN 'OFC'
    WHEN 'medical' THEN 'HLT'
    ELSE NULL
  END;
  IF v_prefix IS NULL THEN
    RAISE EXCEPTION 'Invalid workforce department';
  END IF;

  INSERT INTO public.workforce_registration_counters AS counters (department, last_number)
  VALUES (p_department, 1)
  ON CONFLICT (department) DO UPDATE
    SET last_number = counters.last_number + 1
  RETURNING last_number INTO v_number;

  RETURN 'NUSC-' || v_prefix || '-' || lpad(v_number::TEXT, 3, '0');
END;
$$;
REVOKE ALL ON FUNCTION public.next_workforce_registration_id(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_workforce_registration_id(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.get_campaign_dashboard_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'total_applications', COUNT(*),
    'submitted', COUNT(*) FILTER (WHERE application_status = 'submitted'),
    'under_review', COUNT(*) FILTER (WHERE application_status = 'under_review'),
    'approved', COUNT(*) FILTER (WHERE application_status = 'approved'),
    'waitlisted', COUNT(*) FILTER (WHERE application_status = 'waitlisted'),
    'rejected', COUNT(*) FILTER (WHERE application_status = 'rejected'),
    'ahibi_count', COUNT(*) FILTER (WHERE category = 'ahibi'),
    'volunteer_count', COUNT(*) FILTER (WHERE category = 'volunteer'),
    'media_count', COUNT(*) FILTER (WHERE category = 'media'),
    'crew_count', COUNT(*) FILTER (WHERE category = 'crew'),
    'management_count', COUNT(*) FILTER (WHERE category = 'management'),
    'officials_count', COUNT(*) FILTER (WHERE category = 'officials'),
    'medical_count', COUNT(*) FILTER (WHERE category = 'medical'),
    'potential_duplicate_count', COUNT(*) FILTER (WHERE potential_duplicate)
  )
  FROM public.campaign_applications
  WHERE p_event_id IS NULL OR event_id = p_event_id;
$$;
REVOKE ALL ON FUNCTION public.get_campaign_dashboard_stats(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_dashboard_stats(UUID) TO service_role;
