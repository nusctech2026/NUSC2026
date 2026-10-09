BEGIN;

-- 1. Create dedicated member_profiles table
CREATE TABLE IF NOT EXISTS public.member_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on member_profiles
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.member_profiles;
CREATE POLICY "Users can view own profile" 
    ON public.member_profiles FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.member_profiles;
CREATE POLICY "Users can update own profile" 
    ON public.member_profiles FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.member_profiles;
CREATE POLICY "Service role can manage profiles" 
    ON public.member_profiles FOR ALL 
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- 2. Migrate existing profile data safely (Non-destructive)
INSERT INTO public.member_profiles (user_id, first_name, last_name, phone, created_at, updated_at)
SELECT 
    id::uuid, 
    COALESCE(raw_user_meta_data->>'first_name', 'Unknown'),
    COALESCE(raw_user_meta_data->>'last_name', 'Unknown'),
    COALESCE(raw_user_meta_data->>'phone', 'Unknown'),
    created_at,
    updated_at
FROM auth.users
WHERE id::uuid IN (SELECT user_id::uuid FROM public.members)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Prepare for ₹10 Mandatory Fee (Status tracking on members)
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS membership_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS registration_payment_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS registration_payment_id TEXT;

-- 3.5 Create sequence for membership numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq;

-- 4. Create an atomic RPC to create profile and membership
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
        'active', -- Initial status; they are active but registration is 'pending' until 10 INR paid
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
