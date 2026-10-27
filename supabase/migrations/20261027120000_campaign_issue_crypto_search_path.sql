-- Supabase installs pgcrypto in `extensions`, while the SECURITY DEFINER
-- issuer deliberately fixes its search_path to public, pg_temp. Qualify the
-- cryptographic bytes function so approval and explicit reissue work safely.
CREATE OR REPLACE FUNCTION public.issue_campaign_id(
  p_application_id UUID, p_actor TEXT, p_reissue BOOLEAN DEFAULT false
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_app campaign_applications%ROWTYPE; v_id campaign_ids%ROWTYPE;
BEGIN
  SELECT * INTO v_app FROM campaign_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND OR v_app.application_status <> 'approved' THEN
    RAISE EXCEPTION 'Applicant must be approved first';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM campaign_roles WHERE id = v_app.assigned_role_id
      AND category = v_app.category AND is_active) THEN
    RAISE EXCEPTION 'Assign an active role in the applicant category first';
  END IF;
  SELECT * INTO v_id FROM campaign_ids WHERE application_id = p_application_id FOR UPDATE;
  IF FOUND AND NOT p_reissue THEN
    RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
  END IF;
  IF FOUND THEN
    UPDATE campaign_ids SET pass_slug = encode(extensions.gen_random_bytes(16), 'hex'),
      qr_token = encode(extensions.gen_random_bytes(32), 'hex'), issued_at = clock_timestamp(), issued_by = p_actor,
      valid_from = clock_timestamp(), valid_until = clock_timestamp() + interval '90 days',
      is_active = true, revoked_at = NULL, revoked_by = NULL, updated_at = clock_timestamp()
    WHERE id = v_id.id RETURNING * INTO v_id;
  ELSE
    INSERT INTO campaign_ids (application_id, id_number, issued_by, valid_until)
    VALUES (p_application_id, 'NUSC-ID-' || to_char(now(), 'YYYY') || '-' || upper(encode(extensions.gen_random_bytes(8), 'hex')),
      p_actor, clock_timestamp() + interval '90 days') RETURNING * INTO v_id;
  END IF;
  RETURN jsonb_build_object('success', true, 'idNumber', v_id.id_number, 'passSlug', v_id.pass_slug);
END $$;

REVOKE ALL ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_campaign_id(UUID, TEXT, BOOLEAN) TO service_role;
