-- Separate annual membership match entries from Ticket 1 points redemptions.
-- Staff manage each home match and Ahibi event mapping through Membership Match Entries.
BEGIN;

CREATE TABLE public.membership_home_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    opponent text NOT NULL CHECK (length(trim(opponent)) BETWEEN 1 AND 160),
    date_time timestamptz NOT NULL,
    venue text,
    ahibi_event_id text NOT NULL UNIQUE CHECK (length(trim(ahibi_event_id)) BETWEEN 1 AND 200),
    ahibi_ticket_url text,
    status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX membership_home_matches_open_idx ON public.membership_home_matches(date_time)
    WHERE status = 'upcoming';
ALTER TABLE public.membership_home_matches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_home_matches FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_home_matches TO service_role;

CREATE TABLE public.membership_match_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    membership_start_date timestamptz NOT NULL,
    fixture_id uuid NOT NULL,
    ahibi_event_id text NOT NULL,
    entry_type text NOT NULL,
    token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    status text NOT NULL CHECK (status IN ('reserved', 'session_created', 'redeemed', 'released')),
    ahibi_session_id text UNIQUE,
    booking_id text UNIQUE,
    expires_at timestamptz NOT NULL,
    validated_at timestamptz,
    redeemed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (member_id, membership_start_date, fixture_id)
);
CREATE INDEX membership_match_entries_member_status_idx
    ON public.membership_match_entries(member_id, status, expires_at);
CREATE INDEX membership_match_entries_fixture_idx
    ON public.membership_match_entries(fixture_id, status);

ALTER TABLE public.membership_match_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_match_entries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_match_entries TO service_role;

CREATE FUNCTION public.reserve_membership_match_entry(p_user_id uuid, p_fixture_id uuid, p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    m public.members%ROWTYPE;
    v_entitlements jsonb;
    v_fixture record;
    v_entry public.membership_match_entries%ROWTYPE;
    v_max_matches integer;
    v_reserved_count integer;
    v_entry_type text;
BEGIN
    IF p_user_id IS NULL OR p_fixture_id IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid membership entry request';
    END IF;

    SELECT * INTO STRICT m FROM public.members WHERE user_id = p_user_id FOR UPDATE;
    IF m.status <> 'active' OR m.registration_payment_status IS DISTINCT FROM 'paid'
       OR (m.end_date IS NOT NULL AND m.end_date <= now()) THEN
        RAISE EXCEPTION 'An active paid membership is required';
    END IF;

    SELECT b.metadata INTO v_entitlements
    FROM public.membership_benefits b
    WHERE b.plan_id = m.plan_id AND b.category = 'annual_entitlements' AND b.is_active
      AND b.metadata ? 'home_matches'
    ORDER BY b.created_at DESC LIMIT 1;
    IF v_entitlements IS NULL THEN RAISE EXCEPTION 'This membership has no match entry benefit'; END IF;
    v_max_matches := (v_entitlements->>'home_matches')::integer;
    v_entry_type := COALESCE(v_entitlements->>'entry', 'General');
    IF v_max_matches <= 0 THEN RAISE EXCEPTION 'This membership has no match entry benefit'; END IF;

    -- Match identity and event mapping are read from the authoritative NUSC catalogue.
    SELECT id, opponent, date_time, venue, ahibi_event_id, ahibi_ticket_url
      INTO v_fixture FROM public.membership_home_matches
     WHERE id = p_fixture_id AND status = 'upcoming'
       AND date_time > now() AND (m.end_date IS NULL OR date_time <= m.end_date)
       AND NULLIF(trim(ahibi_event_id), '') IS NOT NULL
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'This home match is not open for member booking'; END IF;

    SELECT * INTO v_entry FROM public.membership_match_entries
     WHERE member_id = m.id AND membership_start_date = m.start_date AND fixture_id = p_fixture_id FOR UPDATE;
    IF FOUND THEN
        IF v_entry.status = 'redeemed' THEN RAISE EXCEPTION 'Your entry for this match has already been used'; END IF;
        IF v_entry.status = 'session_created' THEN RAISE EXCEPTION 'Your Ahibi booking session is already in progress'; END IF;
        IF v_entry.status = 'reserved' AND v_entry.expires_at > now() THEN
            RAISE EXCEPTION 'A booking link for this match is already active';
        END IF;
    END IF;

    SELECT count(*) INTO v_reserved_count FROM public.membership_match_entries
     WHERE member_id = m.id AND membership_start_date = m.start_date AND id IS DISTINCT FROM v_entry.id
       AND (status IN ('redeemed', 'session_created') OR (status = 'reserved' AND expires_at > now()));
    IF v_reserved_count >= v_max_matches THEN RAISE EXCEPTION 'All match entries in this membership have been used'; END IF;

    IF v_entry.id IS NULL THEN
        INSERT INTO public.membership_match_entries
          (member_id, user_id, membership_start_date, fixture_id, ahibi_event_id, entry_type, token_hash, status, expires_at)
        VALUES (m.id, p_user_id, m.start_date, p_fixture_id, v_fixture.ahibi_event_id, v_entry_type, p_token_hash, 'reserved', now() + interval '15 minutes')
        RETURNING * INTO v_entry;
    ELSE
        UPDATE public.membership_match_entries
           SET membership_start_date = m.start_date, ahibi_event_id = v_fixture.ahibi_event_id, entry_type = v_entry_type,
               token_hash = p_token_hash, status = 'reserved', ahibi_session_id = NULL,
               booking_id = NULL, expires_at = now() + interval '15 minutes',
               validated_at = NULL, redeemed_at = NULL, updated_at = now()
         WHERE id = v_entry.id RETURNING * INTO v_entry;
    END IF;

    RETURN jsonb_build_object(
      'entry_id', v_entry.id, 'fixture_id', v_fixture.id, 'opponent', v_fixture.opponent,
      'date_time', v_fixture.date_time, 'venue', v_fixture.venue,
      'ahibi_event_id', v_fixture.ahibi_event_id, 'ahibi_ticket_url', v_fixture.ahibi_ticket_url,
      'entry_type', v_entry.entry_type, 'expires_at', v_entry.expires_at
    );
END;
$$;
REVOKE ALL ON FUNCTION public.reserve_membership_match_entry(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_membership_match_entry(uuid, uuid, text) TO service_role;

CREATE FUNCTION public.bind_membership_match_entry(p_token_hash text, p_ahibi_event_id text, p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE e public.membership_match_entries%ROWTYPE;
BEGIN
    IF p_token_hash !~ '^[0-9a-f]{64}$' OR NULLIF(trim(p_ahibi_event_id), '') IS NULL
       OR NULLIF(trim(p_session_id), '') IS NULL OR length(p_session_id) > 200 THEN
        RAISE EXCEPTION 'Invalid Ahibi membership entry request';
    END IF;
    SELECT mme.* INTO e
      FROM public.membership_match_entries mme
      JOIN public.members member ON member.id = mme.member_id
     WHERE mme.token_hash = p_token_hash
       AND member.status = 'active'
       AND member.registration_payment_status = 'paid'
       AND (member.end_date IS NULL OR member.end_date > now())
       AND member.start_date = mme.membership_start_date
     FOR UPDATE OF mme;
    IF NOT FOUND OR e.ahibi_event_id <> p_ahibi_event_id OR e.expires_at <= now() THEN
        RAISE EXCEPTION 'Invalid or expired membership entry';
    END IF;
    IF e.status = 'session_created' AND e.ahibi_session_id = p_session_id THEN
        RETURN jsonb_build_object('entry_id', e.id, 'entry_type', e.entry_type, 'event_id', e.ahibi_event_id);
    END IF;
    IF e.status <> 'reserved' THEN RAISE EXCEPTION 'Membership entry is not available'; END IF;
    UPDATE public.membership_match_entries
       SET status = 'session_created', ahibi_session_id = p_session_id,
           validated_at = now(), updated_at = now()
     WHERE id = e.id;
    RETURN jsonb_build_object('entry_id', e.id, 'entry_type', e.entry_type, 'event_id', e.ahibi_event_id);
END;
$$;
REVOKE ALL ON FUNCTION public.bind_membership_match_entry(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bind_membership_match_entry(text, text, text) TO service_role;

CREATE FUNCTION public.complete_membership_match_entry(p_entry_id uuid, p_ahibi_event_id text, p_session_id text, p_booking_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE e public.membership_match_entries%ROWTYPE;
BEGIN
    IF p_entry_id IS NULL OR NULLIF(trim(p_ahibi_event_id), '') IS NULL
       OR NULLIF(trim(p_session_id), '') IS NULL OR NULLIF(trim(p_booking_id), '') IS NULL
       OR length(p_booking_id) > 200 THEN RAISE EXCEPTION 'Invalid Ahibi booking callback'; END IF;
    SELECT * INTO e FROM public.membership_match_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND OR e.ahibi_event_id <> p_ahibi_event_id OR e.ahibi_session_id <> p_session_id THEN
        RAISE EXCEPTION 'Membership entry session or event mismatch';
    END IF;
    IF e.status = 'redeemed' AND e.booking_id = p_booking_id THEN
        RETURN jsonb_build_object('status', 'already_redeemed');
    END IF;
    IF e.status <> 'session_created' THEN RAISE EXCEPTION 'Membership entry is not in a bookable state'; END IF;
    UPDATE public.membership_match_entries
       SET status = 'redeemed', booking_id = p_booking_id, redeemed_at = now(), updated_at = now()
     WHERE id = e.id;
    RETURN jsonb_build_object('status', 'redeemed');
END;
$$;
REVOKE ALL ON FUNCTION public.complete_membership_match_entry(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_membership_match_entry(uuid, text, text, text) TO service_role;

CREATE FUNCTION public.release_membership_match_entry(p_entry_id uuid, p_ahibi_event_id text, p_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE e public.membership_match_entries%ROWTYPE;
BEGIN
    IF p_entry_id IS NULL OR NULLIF(trim(p_ahibi_event_id), '') IS NULL
       OR NULLIF(trim(p_session_id), '') IS NULL THEN RAISE EXCEPTION 'Invalid Ahibi failure callback'; END IF;
    SELECT * INTO e FROM public.membership_match_entries WHERE id = p_entry_id FOR UPDATE;
    IF NOT FOUND OR e.ahibi_event_id <> p_ahibi_event_id OR e.ahibi_session_id <> p_session_id THEN
        RAISE EXCEPTION 'Membership entry session or event mismatch';
    END IF;
    IF e.status = 'released' THEN RETURN jsonb_build_object('status', 'already_released'); END IF;
    IF e.status <> 'session_created' THEN RAISE EXCEPTION 'Membership entry is not in a releasable state'; END IF;
    UPDATE public.membership_match_entries SET status = 'released', updated_at = now() WHERE id = e.id;
    RETURN jsonb_build_object('status', 'released');
END;
$$;
REVOKE ALL ON FUNCTION public.release_membership_match_entry(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_membership_match_entry(uuid, text, text) TO service_role;

COMMIT;
