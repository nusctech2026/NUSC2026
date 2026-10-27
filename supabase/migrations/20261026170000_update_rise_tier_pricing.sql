-- Set the listed Rise tier totals in paise and keep checkout's server-side price guard in sync.
BEGIN;

UPDATE public.membership_plans
SET price = CASE slug
    WHEN 'rise-general' THEN 389400
    WHEN 'rise-premium' THEN 1298000
    ELSE price
END
WHERE slug IN ('rise-general', 'rise-premium');

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

COMMIT;
