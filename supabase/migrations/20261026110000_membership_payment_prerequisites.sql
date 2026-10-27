-- Commit the enum extension before the payment migration uses its new value.
-- Payload databases use an enum; SQL-only installations use text and need no change.
BEGIN;

DO $$
DECLARE category_type regtype;
BEGIN
    SELECT a.atttypid::regtype INTO category_type
    FROM pg_attribute a JOIN pg_type t ON t.oid = a.atttypid
    WHERE a.attrelid = 'public.membership_benefits'::regclass
      AND a.attname = 'category' AND NOT a.attisdropped AND t.typtype = 'e';
    IF category_type IS NOT NULL THEN
        EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', category_type, 'annual_entitlements');
    END IF;
END $$;

-- Close the existing arbitrary-identity RPC exposure even if the later migration fails.
ALTER FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    TO service_role;

COMMIT;
