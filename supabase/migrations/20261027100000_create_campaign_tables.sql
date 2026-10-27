-- ============================================================================
-- Campaign Registration & Event Access Control Schema
-- Phase 1 Migration
-- ============================================================================

-- 1. Campaign Events (Lifecycle dates separated from event match dates)
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  venue VARCHAR(255) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_opens_at TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_event_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_reg_dates CHECK (
    registration_closes_at IS NULL OR 
    registration_opens_at IS NULL OR 
    registration_closes_at >= registration_opens_at
  )
);

-- 2. Campaign Roles
CREATE TABLE IF NOT EXISTS public.campaign_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL CHECK (category IN ('ahibi', 'volunteer', 'crew')),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  requirements TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Campaign Applications
CREATE TABLE IF NOT EXISTS public.campaign_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number VARCHAR(64) UNIQUE NOT NULL,
  event_id UUID REFERENCES public.campaign_events(id) ON DELETE SET NULL,
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(50) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  photo_storage_path TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('ahibi', 'volunteer', 'crew')),
  preferred_role_id UUID NOT NULL REFERENCES public.campaign_roles(id),
  assigned_role_id UUID REFERENCES public.campaign_roles(id),
  other_role VARCHAR(255),
  experience TEXT,
  availability TEXT NOT NULL,
  reason_for_joining TEXT,
  emergency_contact_name VARCHAR(255) NOT NULL,
  emergency_contact_phone VARCHAR(50) NOT NULL,
  application_status VARCHAR(50) NOT NULL DEFAULT 'submitted' 
    CHECK (application_status IN ('submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'cancelled')),
  assigned_zone VARCHAR(100),
  assigned_shift VARCHAR(100),
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Campaign IDs (Issued Passes)
CREATE TABLE IF NOT EXISTS public.campaign_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE NOT NULL REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  id_number VARCHAR(64) UNIQUE NOT NULL,
  pass_slug VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  qr_token VARCHAR(128) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by VARCHAR(255) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Campaign Attendance (Gate Check-ins & Audit)
CREATE TABLE IF NOT EXISTS public.campaign_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.campaign_events(id) ON DELETE SET NULL,
  application_id UUID NOT NULL REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaign_ids(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL DEFAULT 'check_in' 
    CHECK (action IN ('check_in', 'check_out', 'duplicate_attempt')),
  gate VARCHAR(100) NOT NULL,
  scanned_by VARCHAR(255) NOT NULL,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 6. Private Storage Bucket for applicant photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign_documents', 'campaign_documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 7. Query-tailored, Non-redundant Composite Indexes
-- Admin applications filter by event, status, category
CREATE INDEX IF NOT EXISTS idx_campaign_apps_event_status_cat 
  ON public.campaign_applications(event_id, application_status, category);

-- Sorting applicants by submission date (Admin pagination)
CREATE INDEX IF NOT EXISTS idx_campaign_apps_submitted_at 
  ON public.campaign_applications(submitted_at DESC);

-- Fast lookup by candidate phone & email for status checks & admin searches
CREATE INDEX IF NOT EXISTS idx_campaign_apps_phone 
  ON public.campaign_applications(phone);

CREATE INDEX IF NOT EXISTS idx_campaign_apps_email 
  ON public.campaign_applications(lower(email));

CREATE INDEX IF NOT EXISTS idx_campaign_apps_name 
  ON public.campaign_applications(lower(full_name) text_pattern_ops);

-- Pass active validity queries
CREATE INDEX IF NOT EXISTS idx_campaign_ids_active_window 
  ON public.campaign_ids(is_active, valid_until) 
  WHERE is_active = true AND revoked_at IS NULL;

-- Fast attendance lookups for duplicate check-in prevention
CREATE INDEX IF NOT EXISTS idx_campaign_attendance_checkin_lookup 
  ON public.campaign_attendance(campaign_id, action, event_id);

-- Attendance audit logs sorting
CREATE INDEX IF NOT EXISTS idx_campaign_attendance_scanned_at 
  ON public.campaign_attendance(scanned_at DESC);

-- 8. Row Level Security Configuration
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_attendance ENABLE ROW LEVEL SECURITY;

-- Clean existing policies if re-run
DROP POLICY IF EXISTS "Public read active events" ON public.campaign_events;
DROP POLICY IF EXISTS "Service role all campaign events" ON public.campaign_events;
DROP POLICY IF EXISTS "Public read active roles" ON public.campaign_roles;
DROP POLICY IF EXISTS "Service role all campaign roles" ON public.campaign_roles;
DROP POLICY IF EXISTS "Service role all campaign applications" ON public.campaign_applications;
DROP POLICY IF EXISTS "Service role all campaign IDs" ON public.campaign_ids;
DROP POLICY IF EXISTS "Service role all campaign attendance" ON public.campaign_attendance;

-- Events: Anonymous public can only view active events
CREATE POLICY "Public read active events" 
  ON public.campaign_events FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Service role all campaign events" 
  ON public.campaign_events FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Roles: Anonymous public can only view active roles
CREATE POLICY "Public read active roles" 
  ON public.campaign_roles FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Service role all campaign roles" 
  ON public.campaign_roles FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Applications: Zero anonymous direct access (no direct INSERT, no direct SELECT).
-- Inserts and queries MUST be handled via trusted Next.js server actions using service_role.
CREATE POLICY "Service role all campaign applications" 
  ON public.campaign_applications FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- IDs: Zero anonymous access.
CREATE POLICY "Service role all campaign IDs" 
  ON public.campaign_ids FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Attendance: Zero anonymous access.
CREATE POLICY "Service role all campaign attendance" 
  ON public.campaign_attendance FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- 9. Seed the 11 Initial Campaign Roles (No hardcoded events)
INSERT INTO public.campaign_roles (category, name, code, description) VALUES
  ('ahibi', 'Ticketing', 'ahibi_ticketing', 'Ticketing desk operations, box office & ticket assistance'),
  ('volunteer', 'Stretcher Boys', 'vol_stretcher_boys', 'Pitch-side medical and emergency transport assistance'),
  ('volunteer', 'Perimeter Team', 'vol_perimeter_team', 'Perimeter boundary monitoring and spectator cordoning'),
  ('volunteer', 'Security', 'vol_security', 'Venue crowd flow, safety checkpoints & access lane coordination'),
  ('volunteer', 'Supervisors', 'vol_supervisors', 'Section lead coordination and team task supervision'),
  ('volunteer', 'Hospitality', 'vol_hospitality', 'VIP reception, guest guidance and refreshments coordination'),
  ('crew', 'Lights', 'crew_lights', 'Lighting towers, spot lighting and field illuminations crew'),
  ('crew', 'LED', 'crew_led', 'LED display boards, advertising hoardings and video screens'),
  ('crew', 'Sound', 'crew_sound', 'PA system, stadium audio mixing and sideline announcers'),
  ('crew', 'Technician', 'crew_technician', 'Electrical wiring, generator maintenance and technical operations'),
  ('crew', 'Others', 'crew_others', 'General matchday logistics and stage setup support')
ON CONFLICT (code) DO NOTHING;

-- 10. Atomic Verification & Check-in PostgreSQL Function (SECURITY DEFINER, locked down)
CREATE OR REPLACE FUNCTION public.verify_and_check_in_campaign_id(
  p_qr_token TEXT,
  p_gate TEXT,
  p_scanned_by TEXT,
  p_event_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id RECORD;
  v_app RECORD;
  v_existing RECORD;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_target_event_id UUID;
  v_role_name TEXT;
BEGIN
  -- Validate inputs
  IF p_qr_token IS NULL OR trim(p_qr_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'QR token is required');
  END IF;
  
  IF p_gate IS NULL OR trim(p_gate) = '' THEN
    RETURN jsonb_build_object('success', false, 'code', 'GATE_REQUIRED', 'message', 'Gate identifier is required');
  END IF;

  -- 1. Row-level lock on ID record to serialize concurrent scans
  SELECT * INTO v_id 
  FROM public.campaign_ids 
  WHERE qr_token = p_qr_token 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVALID_TOKEN', 'message', 'Invalid or unrecognised QR token');
  END IF;

  -- 2. Validate revocation and active state
  IF NOT v_id.is_active OR v_id.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'REVOKED', 
      'message', 'This ID pass has been revoked and cannot be used for entry',
      'revoked_at', v_id.revoked_at
    );
  END IF;

  -- 3. Validate validity window
  IF v_now < v_id.valid_from THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'NOT_YET_VALID', 
      'message', 'This ID pass is not yet valid for entry',
      'valid_from', v_id.valid_from
    );
  END IF;

  IF v_now > v_id.valid_until THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'EXPIRED', 
      'message', 'This ID pass has expired',
      'valid_until', v_id.valid_until
    );
  END IF;

  -- 4. Load Application and check approved status
  SELECT a.*, r.name AS role_name INTO v_app
  FROM public.campaign_applications a
  LEFT JOIN public.campaign_roles r ON a.assigned_role_id = r.id
  WHERE a.id = v_id.application_id;

  IF NOT FOUND OR v_app.application_status != 'approved' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'code', 'NOT_APPROVED', 
      'message', 'Candidate is not approved for event entry'
    );
  END IF;

  v_target_event_id := COALESCE(p_event_id, v_app.event_id);
  v_role_name := COALESCE(v_app.role_name, v_app.other_role, 'Assigned Personnel');

  -- 5. Atomically check for prior successful check-in
  SELECT id, scanned_at, gate, scanned_by INTO v_existing
  FROM public.campaign_attendance
  WHERE campaign_id = v_id.id
    AND action = 'check_in'
    AND (v_target_event_id IS NULL OR event_id = v_target_event_id)
  ORDER BY scanned_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Record duplicate check-in attempt
    INSERT INTO public.campaign_attendance (
      event_id, application_id, campaign_id, action, gate, scanned_by, scanned_at, notes
    ) VALUES (
      v_target_event_id, v_app.id, v_id.id, 'duplicate_attempt', p_gate, p_scanned_by, v_now,
      'Duplicate scan detected. First check-in occurred at ' || to_char(v_existing.scanned_at, 'HH24:MI:SS')
    );

    RETURN jsonb_build_object(
      'success', false,
      'code', 'ALREADY_CHECKED_IN',
      'message', 'Candidate has ALREADY been checked in',
      'first_scanned_at', v_existing.scanned_at,
      'first_gate', v_existing.gate,
      'first_scanned_by', v_existing.scanned_by,
      'candidate', jsonb_build_object(
        'id_number', v_id.id_number,
        'full_name', v_app.full_name,
        'photo_storage_path', v_app.photo_storage_path,
        'category', v_app.category,
        'assigned_role', v_role_name,
        'assigned_zone', v_app.assigned_zone,
        'assigned_shift', v_app.assigned_shift
      )
    );
  END IF;

  -- 6. No prior check-in: atomically record successful check-in
  INSERT INTO public.campaign_attendance (
    event_id, application_id, campaign_id, action, gate, scanned_by, scanned_at, notes
  ) VALUES (
    v_target_event_id, v_app.id, v_id.id, 'check_in', p_gate, p_scanned_by, v_now, 'Gate check-in verified'
  );

  RETURN jsonb_build_object(
    'success', true,
    'code', 'CHECK_IN_SUCCESS',
    'message', 'Check-in verified successfully',
    'scanned_at', v_now,
    'gate', p_gate,
    'candidate', jsonb_build_object(
      'id_number', v_id.id_number,
      'full_name', v_app.full_name,
      'photo_storage_path', v_app.photo_storage_path,
      'category', v_app.category,
      'assigned_role', v_role_name,
      'assigned_zone', v_app.assigned_zone,
      'assigned_shift', v_app.assigned_shift
    )
  );
END;
$$;

-- 11. Dashboard Aggregation PostgreSQL Function (Fast Free-tier stats)
CREATE OR REPLACE FUNCTION public.get_campaign_dashboard_stats(p_event_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
    'crew_count', COUNT(*) FILTER (WHERE category = 'crew')
  )
  FROM public.campaign_applications
  WHERE p_event_id IS NULL OR event_id = p_event_id;
$$;

-- 12. Explicit Security Lock Down on SECURITY DEFINER RPCs
-- Revoke all default execution rights from anonymous / public roles
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_check_in_campaign_id(TEXT, TEXT, TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.get_campaign_dashboard_stats(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_campaign_dashboard_stats(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_campaign_dashboard_stats(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_dashboard_stats(UUID) TO service_role;

-- 13. Payload CMS Locked Document FK Support
ALTER TABLE IF EXISTS public.payload_locked_documents_rels 
  ADD COLUMN IF NOT EXISTS campaign_applications_id uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payload_locked_documents_rels') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'payload_locked_documents_rels_campaign_applications_fk'
    ) THEN
      ALTER TABLE public.payload_locked_documents_rels 
        ADD CONSTRAINT payload_locked_documents_rels_campaign_applications_fk 
        FOREIGN KEY (campaign_applications_id) 
        REFERENCES public.campaign_applications(id) 
        ON DELETE CASCADE;
    END IF;
  END IF;
END $$;
