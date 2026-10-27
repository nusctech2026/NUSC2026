-- Temporary, single-use live checkout for one server-configured Rise tester.
-- The marker and amount are stored atomically with the reserved payment order.
BEGIN;

ALTER TABLE public.membership_payment_orders
    ADD COLUMN is_smoke_test boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT membership_smoke_test_order_check CHECK (
        NOT is_smoke_test OR (purpose = 'tier' AND amount = 100 AND currency = 'INR')
    );

-- At most one smoke order may ever be reserved in this NUSC database.
CREATE UNIQUE INDEX membership_single_rise_smoke_test_order
    ON public.membership_payment_orders (is_smoke_test)
    WHERE is_smoke_test;

-- Normal checkout must never reuse a pending ₹1 smoke-test order after the
-- feature flag has been disabled.
CREATE OR REPLACE FUNCTION public.begin_membership_payment(p_user_id uuid, p_plan_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    m public.members%ROWTYPE;
    p public.membership_plans%ROWTYPE;
    o public.membership_payment_orders%ROWTYPE;
    current_price bigint;
BEGIN
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
    IF p.id IS NULL OR p.price <> (CASE p.slug WHEN 'registration' THEN 1000 WHEN 'rise-general' THEN 389400 WHEN 'rise-premium' THEN 1298000 ELSE -1 END)
    THEN RAISE EXCEPTION 'Membership pricing is not configured correctly'; END IF;

    UPDATE public.membership_payment_orders SET status = 'creation_failed' WHERE member_id = m.id
      AND status = 'creating' AND created_at < now() - interval '5 minutes';
    SELECT * INTO o FROM public.membership_payment_orders WHERE member_id = m.id AND status IN ('creating', 'pending');
    IF o.id IS NOT NULL THEN
        IF o.is_smoke_test THEN RAISE EXCEPTION 'Complete the existing pending payment first'; END IF;
        IF (p_plan_id IS NULL AND o.purpose = 'registration') OR (o.purpose = 'tier' AND o.plan_id = p.id) THEN
            RETURN to_jsonb(o) || jsonb_build_object('newly_created', false);
        END IF;
        RAISE EXCEPTION 'Complete the existing pending payment first';
    END IF;
    INSERT INTO public.membership_payment_orders(member_id, user_id, plan_id, purpose, amount)
    VALUES (m.id, p_user_id, p.id, CASE WHEN p_plan_id IS NULL THEN 'registration' ELSE 'tier' END, p.price)
    RETURNING * INTO o;
    RETURN to_jsonb(o) || jsonb_build_object('newly_created', true);
END $$;
REVOKE ALL ON FUNCTION public.begin_membership_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_payment(uuid, uuid) TO service_role;

-- This RPC is service-role-only. The NUSC server independently authorizes the
-- authenticated Supabase user against its private allowlist before calling it.
CREATE FUNCTION public.begin_membership_smoke_test_payment(p_user_id uuid, p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_member_id uuid;
    o public.membership_payment_orders%ROWTYPE;
    reserved jsonb;
BEGIN
    SELECT id INTO STRICT v_member_id FROM public.members WHERE user_id::text = p_user_id::text FOR UPDATE;

    SELECT * INTO o FROM public.membership_payment_orders WHERE is_smoke_test FOR UPDATE;
    IF o.id IS NOT NULL THEN
        IF o.user_id::text = p_user_id::text AND o.plan_id = p_plan_id AND o.status IN ('creating', 'pending') THEN
            RETURN to_jsonb(o) || jsonb_build_object('newly_created', false);
        END IF;
        RAISE EXCEPTION 'Rise live smoke test has already been used';
    END IF;

    reserved := public.begin_membership_payment(p_user_id, p_plan_id);
    IF coalesce((reserved->>'newly_created')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Complete the existing pending payment first';
    END IF;

    UPDATE public.membership_payment_orders AS payment_order
       SET amount = 100, is_smoke_test = true
     WHERE payment_order.id = (reserved->>'id')::uuid
       AND payment_order.member_id = v_member_id
       AND payment_order.user_id::text = p_user_id::text
       AND payment_order.purpose = 'tier'
       AND payment_order.status = 'creating'
       AND payment_order.amount IN (389400, 1298000)
    RETURNING * INTO o;
    IF o.id IS NULL THEN RAISE EXCEPTION 'Rise live smoke test is unavailable'; END IF;
    RETURN to_jsonb(o) || jsonb_build_object('newly_created', true);
END $$;
REVOKE ALL ON FUNCTION public.begin_membership_smoke_test_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_smoke_test_payment(uuid, uuid) TO service_role;

-- Preserve captured-amount matching and duplicate reconciliation. Smoke orders
-- still settle only against their stored ₹1 amount; tier eligibility compares
-- the actual listed tier prices, not the reduced test charge.
CREATE OR REPLACE FUNCTION public.settle_membership_payment(p_order_id text, p_payment_id text, p_amount bigint, p_currency text)
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
                IF current_price >= (CASE WHEN o.is_smoke_test THEN p.price ELSE o.amount END) THEN v_reason := 'membership_payment_conflict'; END IF;
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
REVOKE ALL ON FUNCTION public.settle_membership_payment(text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_membership_payment(text, text, bigint, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
