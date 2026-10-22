-- One membership payment ticket. Forward-only; Ticket 1 redemption/wallet functions are untouched.
BEGIN;

-- Each authenticated account has one authoritative membership to lock and settle.
-- Existing duplicates must be reconciled explicitly; never discard historical rows.
CREATE UNIQUE INDEX membership_one_member_per_user ON public.members(user_id);

-- Reuse the existing manually-entered plans where possible, retaining member/benefit references.
UPDATE public.membership_plans old SET slug = mapping.slug
FROM (VALUES ('base-membership','registration'),('rise general','rise-general'),
             ('rise premium','rise-premium'),('rise vip box','rise-vip-box')) AS mapping(legacy,slug)
WHERE lower(trim(old.slug)) = mapping.legacy
  AND NOT EXISTS (SELECT 1 FROM public.membership_plans canonical WHERE canonical.slug = mapping.slug);

INSERT INTO public.membership_plans (name, slug, price, billing_cycle, is_purchasable_online, is_active)
VALUES ('Registered Member', 'registration', 1000, 'annual', false, true),
       ('Rise General', 'rise-general', 300000, 'annual', true, true),
       ('Rise Premium', 'rise-premium', 1000000, 'annual', true, true),
       ('Rise VIP Box', 'rise-vip-box', 45000000, 'annual', false, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price,
    billing_cycle = EXCLUDED.billing_cycle, is_purchasable_online = EXCLUDED.is_purchasable_online;

-- Entitlement metadata belongs to the purchased database plan; the registration fee grants no tier perks.
INSERT INTO public.membership_benefits(plan_id,category,description,metadata,is_active)
SELECT p.id, 'annual_entitlements', p.name || ' annual benefits', v.entitlements::jsonb, true
FROM public.membership_plans p JOIN (VALUES
  ('rise-general', '{"home_matches":10,"entry":"General","guests_per_match":1,"named_cards":1,"merchandise_discount_percent":5,"welcome_pack":"Digital pack"}'),
  ('rise-premium', '{"home_matches":10,"entry":"Premium Gallery","guests_per_match":1,"named_cards":1,"merchandise_discount_percent":10,"welcome_pack":"Scarf and digital pack"}'),
  ('rise-vip-box', '{"home_matches":10,"entry":"VIP Box","guests_per_match":7,"named_cards":7,"merchandise_discount_percent":15,"discount_scope":"lead_member","welcome_pack":"Seven scarves and box welcome pack"}')
) AS v(slug,entitlements) ON p.slug = v.slug
WHERE NOT EXISTS (SELECT 1 FROM public.membership_benefits b WHERE b.plan_id = p.id AND b.category = 'annual_entitlements');

-- Retain old plans and memberships for history. Only the canonical slugs are sold by this flow.
CREATE TABLE public.membership_payment_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    plan_id uuid NOT NULL REFERENCES public.membership_plans(id),
    purpose text NOT NULL CHECK (purpose IN ('registration', 'tier')),
    amount bigint NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status text NOT NULL DEFAULT 'creating' CHECK (status IN ('creating', 'pending', 'paid', 'creation_failed', 'cancelled')),
    razorpay_order_id text UNIQUE,
    payment_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    paid_at timestamptz
);
CREATE UNIQUE INDEX membership_one_open_payment ON public.membership_payment_orders(member_id)
    WHERE status IN ('creating', 'pending');
ALTER TABLE public.membership_payment_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_payment_orders FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.membership_payment_orders TO authenticated;
GRANT ALL ON public.membership_payment_orders TO service_role;
CREATE POLICY membership_own_payments ON public.membership_payment_orders FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Import already-issued registration orders, including abandoned checkouts, so the new atomic
-- handler can settle old and new orders without trusting Razorpay notes as identity.
INSERT INTO public.membership_payment_orders
    (member_id, user_id, plan_id, purpose, amount, status, razorpay_order_id, payment_id)
SELECT id, user_id::uuid, plan_id, 'registration', 1000,
       CASE WHEN registration_payment_status = 'paid' THEN 'paid' ELSE 'pending' END,
       registration_order_id, registration_payment_id
FROM public.members WHERE registration_order_id LIKE 'order_%';

-- Existing registration definer must never be callable with arbitrary identity by the public.
ALTER FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_member_profile_and_record(uuid,text,text,text,text,date,uuid,text)
    TO service_role;

CREATE FUNCTION public.begin_membership_payment(p_user_id uuid, p_plan_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    m public.members%ROWTYPE;
    p public.membership_plans%ROWTYPE;
    o public.membership_payment_orders%ROWTYPE;
    current_price bigint;
BEGIN
    -- Serialize all order creation, settlement and offline activation on the member row.
    SELECT * INTO STRICT m FROM public.members WHERE user_id::text = p_user_id::text FOR UPDATE;
    IF m.status = 'cancelled' THEN RAISE EXCEPTION 'Membership is cancelled'; END IF;
    IF p_plan_id IS NULL THEN
        IF m.registration_payment_status = 'paid' THEN RAISE EXCEPTION 'Registration is already paid'; END IF;
        SELECT * INTO p FROM public.membership_plans WHERE slug = 'registration' AND is_active;
    ELSE
        IF m.registration_payment_status IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'Registration payment is required'; END IF;
        SELECT * INTO p FROM public.membership_plans WHERE id = p_plan_id AND is_active
          AND is_purchasable_online AND slug IN ('rise-general', 'rise-premium');
        IF p.id IS NULL THEN RAISE EXCEPTION 'Plan is not available for online payment'; END IF;
        IF m.status = 'active' AND (m.end_date IS NULL OR m.end_date > now()) THEN
            SELECT price INTO current_price FROM public.membership_plans WHERE id = m.plan_id;
            IF p.price <= current_price THEN RAISE EXCEPTION 'Choose a higher membership tier'; END IF;
        END IF;
    END IF;
    IF p.id IS NULL OR p.price <> (CASE p.slug WHEN 'registration' THEN 1000 WHEN 'rise-general' THEN 300000 WHEN 'rise-premium' THEN 1000000 ELSE -1 END)
    THEN RAISE EXCEPTION 'Membership pricing is not configured correctly'; END IF;

    -- A creation lease may be retried after a crashed request; checkout is never returned before binding.
    UPDATE public.membership_payment_orders SET status = 'creation_failed' WHERE member_id = m.id
      AND status = 'creating' AND created_at < now() - interval '5 minutes';
    SELECT * INTO o FROM public.membership_payment_orders WHERE member_id = m.id AND status IN ('creating', 'pending');
    IF o.id IS NOT NULL THEN
        IF (p_plan_id IS NULL AND o.purpose = 'registration') OR (o.purpose = 'tier' AND o.plan_id = p.id) THEN
            RETURN to_jsonb(o) || jsonb_build_object('newly_created',false);
        END IF;
        RAISE EXCEPTION 'Complete the existing pending payment first';
    END IF;
    INSERT INTO public.membership_payment_orders(member_id, user_id, plan_id, purpose, amount)
    VALUES (m.id, p_user_id, p.id, CASE WHEN p_plan_id IS NULL THEN 'registration' ELSE 'tier' END, p.price)
    RETURNING * INTO o;
    RETURN to_jsonb(o) || jsonb_build_object('newly_created',true);
END $$;
REVOKE ALL ON FUNCTION public.begin_membership_payment(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_payment(uuid,uuid) TO service_role;

CREATE FUNCTION public.cancel_membership_payment(p_user_id uuid,p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m public.members%ROWTYPE; o public.membership_payment_orders%ROWTYPE;
BEGIN
    SELECT * INTO STRICT m FROM public.members WHERE user_id::text = p_user_id::text FOR UPDATE;
    SELECT * INTO o FROM public.membership_payment_orders WHERE id = p_order_id AND member_id = m.id AND purpose = 'tier' FOR UPDATE;
    IF o.id IS NULL THEN RAISE EXCEPTION 'Payment order not found for your account.'; END IF;
    IF o.status = 'paid' THEN RETURN jsonb_build_object('status','already_processed'); END IF;
    UPDATE public.membership_payment_orders SET status = 'cancelled'
      WHERE id = o.id AND status IN ('creating','pending');
    RETURN jsonb_build_object('status','cancelled');
END $$;
REVOKE ALL ON FUNCTION public.cancel_membership_payment(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_membership_payment(uuid,uuid) TO service_role;

CREATE FUNCTION public.settle_membership_payment(p_order_id text, p_payment_id text, p_amount bigint, p_currency text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    o public.membership_payment_orders%ROWTYPE;
    m public.members%ROWTYPE;
    p public.membership_plans%ROWTYPE;
    v_reason text;
    recon_id uuid;
    current_price bigint;
BEGIN
    IF p_payment_id !~ '^pay_[A-Za-z0-9]+$' OR p_order_id !~ '^order_[A-Za-z0-9]+$'
       OR p_payment_id IS NULL OR p_order_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_currency IS NULL
    THEN RAISE EXCEPTION 'Invalid captured payment'; END IF;
    SELECT * INTO o FROM public.membership_payment_orders WHERE razorpay_order_id = p_order_id;
    IF o.id IS NULL THEN
        v_reason := 'unmapped_order_charge';
    ELSE
        SELECT * INTO m FROM public.members WHERE id = o.member_id FOR UPDATE;
        SELECT * INTO o FROM public.membership_payment_orders WHERE id = o.id FOR UPDATE;
        IF o.status = 'paid' AND o.payment_id = p_payment_id AND o.amount = p_amount AND o.currency = p_currency THEN
            RETURN jsonb_build_object('status', 'already_processed');
        END IF;
        SELECT * INTO p FROM public.membership_plans WHERE id = o.plan_id;
        IF o.amount <> p_amount OR o.currency <> p_currency THEN v_reason := 'payment_amount_mismatch';
        ELSIF o.status = 'paid' OR EXISTS (SELECT 1 FROM public.membership_payment_orders WHERE payment_id = p_payment_id) THEN v_reason := 'duplicate_financial_charge';
        ELSIF o.status <> 'pending' OR m.status = 'cancelled' THEN v_reason := 'membership_payment_conflict';
        ELSIF o.purpose = 'registration' AND m.registration_payment_status = 'paid' THEN v_reason := 'duplicate_financial_charge';
        ELSIF o.purpose = 'tier' THEN
            IF m.registration_payment_status IS DISTINCT FROM 'paid' OR NOT p.is_active OR NOT p.is_purchasable_online
               OR p.slug NOT IN ('rise-general','rise-premium') THEN v_reason := 'membership_payment_conflict';
            ELSIF m.status = 'active' AND (m.end_date IS NULL OR m.end_date > now()) THEN
                SELECT price INTO current_price FROM public.membership_plans WHERE id = m.plan_id;
                IF current_price >= o.amount THEN v_reason := 'membership_payment_conflict'; END IF;
            END IF;
        END IF;
    END IF;
    IF v_reason IS NOT NULL THEN
        INSERT INTO public.payment_reconciliations(member_id,order_id,existing_payment_id,duplicate_payment_id,amount,currency,reason,status)
        VALUES (o.member_id,p_order_id,coalesce(o.payment_id,'none'),p_payment_id,p_amount,p_currency,v_reason,'requires_manual_refund')
        ON CONFLICT (duplicate_payment_id,reason) DO UPDATE SET duplicate_payment_id = EXCLUDED.duplicate_payment_id
        RETURNING id INTO recon_id;
        RETURN jsonb_build_object('status','requires_manual_refund','reason',v_reason,'reconciliation_id',recon_id);
    END IF;
    UPDATE public.membership_payment_orders SET status = 'paid', payment_id = p_payment_id, paid_at = now() WHERE id = o.id;
    IF o.purpose = 'registration' THEN
        UPDATE public.members SET registration_payment_status = 'paid', registration_payment_id = p_payment_id,
            status = CASE WHEN status = 'pending_payment' THEN 'active' ELSE status END WHERE id = m.id;
    ELSE
        UPDATE public.members SET plan_id = o.plan_id, status = 'active', start_date = now(), end_date = now() + interval '1 year' WHERE id = m.id;
    END IF;
    RETURN jsonb_build_object('status','paid');
END $$;
REVOKE ALL ON FUNCTION public.settle_membership_payment(text,text,bigint,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_membership_payment(text,text,bigint,text) TO service_role;

CREATE TABLE public.membership_offline_activations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id uuid NOT NULL REFERENCES public.members(id),
    actor_id uuid NOT NULL REFERENCES auth.users(id),
    payment_reference text NOT NULL UNIQUE,
    amount bigint NOT NULL,
    activated_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);
ALTER TABLE public.membership_offline_activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_offline_activations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_offline_activations TO service_role;

CREATE FUNCTION public.activate_vip_membership(p_member_id uuid,p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m public.members%ROWTYPE; p public.membership_plans%ROWTYPE; actor uuid := auth.uid();
BEGIN
    IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id::text = actor::text AND role IN ('super_admin','store_manager'))
    THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    IF p_reference IS NULL OR length(trim(p_reference)) < 3 OR length(trim(p_reference)) > 200 THEN RAISE EXCEPTION 'Payment reference is required'; END IF;
    SELECT * INTO m FROM public.members WHERE id = p_member_id FOR UPDATE;
    IF m.id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
    IF m.registration_payment_status IS DISTINCT FROM 'paid' THEN RAISE EXCEPTION 'Registration payment is required'; END IF;
    IF m.status = 'cancelled' THEN RAISE EXCEPTION 'Membership is cancelled'; END IF;
    SELECT * INTO p FROM public.membership_plans WHERE slug = 'rise-vip-box' AND is_active AND NOT is_purchasable_online AND price = 45000000;
    IF p.id IS NULL THEN RAISE EXCEPTION 'VIP plan unavailable'; END IF;
    IF m.plan_id = p.id AND m.status = 'active' AND (m.end_date IS NULL OR m.end_date > now()) THEN RAISE EXCEPTION 'VIP membership is already active'; END IF;
    IF EXISTS (SELECT 1 FROM public.membership_payment_orders WHERE member_id = m.id AND status IN ('creating','pending')) THEN RAISE EXCEPTION 'An online membership payment is pending'; END IF;
    IF EXISTS (SELECT 1 FROM public.membership_offline_activations WHERE payment_reference = trim(p_reference)) THEN RAISE EXCEPTION 'Offline payment reference already used'; END IF;
    INSERT INTO public.membership_offline_activations(member_id,actor_id,payment_reference,amount,expires_at)
    VALUES(m.id,actor,trim(p_reference),p.price,now()+interval '1 year');
    UPDATE public.members SET plan_id = p.id, status = 'active', start_date = now(), end_date = now()+interval '1 year' WHERE id = m.id;
    RETURN jsonb_build_object('status','active','expires_at',now()+interval '1 year');
END $$;
REVOKE ALL ON FUNCTION public.activate_vip_membership(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_vip_membership(uuid,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
