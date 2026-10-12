-- Forward migration: Membership schema hardening, sequence initialization, and RLS text-cast alignment
-- Applied without modifying past migration history.

BEGIN;

-- 1. Ensure member_number_seq exists with appropriate start value and permissions
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq START WITH 2050;
GRANT USAGE, SELECT ON SEQUENCE public.member_number_seq TO authenticated, service_role, anon, postgres;

-- Align sequence value above any existing membership number
SELECT setval(
    'public.member_number_seq', 
    GREATEST(
        2050, 
        COALESCE((SELECT MAX(SUBSTRING(membership_number FROM 9)::BIGINT) FROM public.members WHERE membership_number ~ '^NUSC[0-9]{8}$'), 2000)
    ), 
    true
);

-- 2. Enable RLS and harden policies with explicit text cast for varchar/text user_id columns
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own membership" ON public.members;
CREATE POLICY "Users can view their own membership" 
    ON public.members FOR SELECT 
    USING ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can view their own redemptions" ON public.benefit_redemptions;
CREATE POLICY "Users can view their own redemptions" 
    ON public.benefit_redemptions FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.members WHERE id = benefit_redemptions.member_id AND (auth.uid())::text = user_id));

DROP POLICY IF EXISTS "Users can view own profile" ON public.member_profiles;
CREATE POLICY "Users can view own profile" 
    ON public.member_profiles FOR SELECT 
    USING ((auth.uid())::text = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.member_profiles;
CREATE POLICY "Users can update own profile" 
    ON public.member_profiles FOR UPDATE 
    USING ((auth.uid())::text = user_id);

-- 3. Atomic RPC for creating member profile and membership with sequence-backed membership numbers
CREATE OR REPLACE FUNCTION public.create_member_profile_and_record(
    p_user_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_phone TEXT,
    p_address TEXT,
    p_dob DATE,
    p_plan_id UUID,
    p_membership_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_member_number TEXT;
    v_member_record public.members%ROWTYPE;
BEGIN
    -- 1. Create Profile
    INSERT INTO public.member_profiles (user_id, first_name, last_name, phone, address, date_of_birth)
    VALUES (p_user_id, p_first_name, p_last_name, p_phone, p_address, p_dob);

    -- 2. Generate Membership Number
    v_member_number := 'NUSC' || to_char(CURRENT_DATE, 'YYMM') || lpad(nextval('public.member_number_seq')::text, 4, '0');

    -- 3. Create Membership Record
    INSERT INTO public.members (
        user_id, 
        plan_id, 
        membership_number, 
        status, 
        registration_payment_status,
        start_date
    )
    VALUES (
        p_user_id, 
        p_plan_id, 
        v_member_number, 
        'pending_payment', -- Set to pending_payment initially until payment verified
        'pending',
        CURRENT_DATE
    )
    RETURNING * INTO v_member_record;

    RETURN jsonb_build_object(
        'success', true,
        'member_number', v_member_number,
        'first_name', p_first_name
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create member profile and record: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
