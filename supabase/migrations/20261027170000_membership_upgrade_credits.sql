-- Difference-based Rise Premium upgrades. Credits come from a settled General
-- payment order; the browser never supplies the credit or checkout amount.
BEGIN;

ALTER TABLE public.membership_payment_orders
  ADD COLUMN upgrade_from_plan_id uuid REFERENCES public.membership_plans(id),
  ADD COLUMN upgrade_credit_source_order_id uuid REFERENCES public.membership_payment_orders(id),
  ADD COLUMN upgrade_credit_amount bigint NOT NULL DEFAULT 0 CHECK (upgrade_credit_amount >= 0),
  ADD COLUMN is_smoke_test_upgrade boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT membership_smoke_upgrade_order_check CHECK (
    NOT is_smoke_test_upgrade OR (
      purpose = 'tier' AND amount = 200 AND currency = 'INR'
      AND upgrade_from_plan_id IS NOT NULL
      AND upgrade_credit_source_order_id IS NOT NULL
      AND upgrade_credit_amount = 0
    )
  );

CREATE UNIQUE INDEX membership_upgrade_credit_used_once
  ON public.membership_payment_orders (upgrade_credit_source_order_id)
  WHERE upgrade_credit_source_order_id IS NOT NULL AND status IN ('creating', 'pending', 'paid');
CREATE UNIQUE INDEX membership_single_rise_smoke_upgrade
  ON public.membership_payment_orders (is_smoke_test_upgrade)
  WHERE is_smoke_test_upgrade;

CREATE OR REPLACE FUNCTION public.begin_membership_payment(p_user_id uuid, p_plan_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  m public.members%ROWTYPE;
  p public.membership_plans%ROWTYPE;
  current_plan public.membership_plans%ROWTYPE;
  o public.membership_payment_orders%ROWTYPE;
  credit_source public.membership_payment_orders%ROWTYPE;
  v_amount bigint;
  v_credit bigint := 0;
  v_upgrade_from_plan uuid;
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
    IF m.status = 'active' AND m.end_date IS NOT NULL AND m.end_date > now() THEN
      SELECT * INTO current_plan FROM public.membership_plans WHERE id = m.plan_id;
      IF current_plan.id IS NULL OR p.price <= current_plan.price THEN RAISE EXCEPTION 'Choose a higher membership tier'; END IF;
      IF current_plan.slug = 'rise-general' AND p.slug = 'rise-premium' THEN
        v_upgrade_from_plan := current_plan.id;
        SELECT * INTO credit_source FROM public.membership_payment_orders
          WHERE member_id = m.id AND plan_id = current_plan.id AND purpose = 'tier' AND status = 'paid'
          ORDER BY paid_at DESC NULLS LAST, created_at DESC LIMIT 1;
        IF credit_source.id IS NOT NULL THEN
          IF credit_source.is_smoke_test THEN
            RAISE EXCEPTION 'Smoke test upgrade requires the restricted test checkout';
          END IF;
          IF credit_source.currency <> 'INR' OR credit_source.amount <> 389400 THEN
            RAISE EXCEPTION 'Membership payment credit could not be verified';
          END IF;
          v_credit := credit_source.amount;
        END IF;
      END IF;
    END IF;
  END IF;
  IF p.id IS NULL OR p.price <> (CASE p.slug WHEN 'registration' THEN 1000 WHEN 'rise-general' THEN 389400 WHEN 'rise-premium' THEN 1298000 ELSE -1 END)
  THEN RAISE EXCEPTION 'Membership pricing is not configured correctly'; END IF;
  v_amount := p.price - v_credit;
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Membership upgrade amount is invalid'; END IF;

  UPDATE public.membership_payment_orders SET status = 'creation_failed'
    WHERE member_id = m.id AND status = 'creating' AND created_at < now() - interval '5 minutes';
  SELECT * INTO o FROM public.membership_payment_orders WHERE member_id = m.id AND status IN ('creating', 'pending');
  IF o.id IS NOT NULL THEN
    IF o.is_smoke_test_upgrade THEN RAISE EXCEPTION 'Smoke test upgrade requires the restricted test checkout'; END IF;
    IF (p_plan_id IS NULL AND o.purpose = 'registration') OR
       (o.purpose = 'tier' AND o.plan_id = p.id AND o.amount = v_amount
        AND o.upgrade_from_plan_id IS NOT DISTINCT FROM v_upgrade_from_plan
        AND o.upgrade_credit_source_order_id IS NOT DISTINCT FROM credit_source.id) THEN
      RETURN to_jsonb(o) || jsonb_build_object('newly_created', false);
    END IF;
    RAISE EXCEPTION 'Complete the existing pending payment first';
  END IF;

  INSERT INTO public.membership_payment_orders(
    member_id, user_id, plan_id, purpose, amount, upgrade_from_plan_id,
    upgrade_credit_source_order_id, upgrade_credit_amount
  ) VALUES (
    m.id, p_user_id, p.id, CASE WHEN p_plan_id IS NULL THEN 'registration' ELSE 'tier' END,
    v_amount, v_upgrade_from_plan, credit_source.id, v_credit
  ) RETURNING * INTO o;
  RETURN to_jsonb(o) || jsonb_build_object('newly_created', true);
END $$;
REVOKE ALL ON FUNCTION public.begin_membership_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_payment(uuid, uuid) TO service_role;

-- This separate one-use gate is restricted by the web server's authenticated
-- Supabase user allowlist. It only applies to the account with a paid ₹1
-- General smoke order and always creates exactly a ₹2 Premium upgrade order.
CREATE FUNCTION public.begin_membership_smoke_test_upgrade_payment(p_user_id uuid, p_plan_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  m public.members%ROWTYPE;
  p public.membership_plans%ROWTYPE;
  general_plan public.membership_plans%ROWTYPE;
  source_order public.membership_payment_orders%ROWTYPE;
  o public.membership_payment_orders%ROWTYPE;
BEGIN
  SELECT * INTO STRICT m FROM public.members WHERE user_id::text = p_user_id::text FOR UPDATE;
  SELECT * INTO p FROM public.membership_plans WHERE id = p_plan_id AND slug = 'rise-premium' AND is_active AND is_purchasable_online;
  SELECT * INTO general_plan FROM public.membership_plans WHERE slug = 'rise-general';
  IF p.id IS NULL OR p.price <> 1298000 OR general_plan.id IS NULL OR m.registration_payment_status IS DISTINCT FROM 'paid'
     OR m.status <> 'active' OR m.plan_id <> general_plan.id OR m.end_date IS NULL OR m.end_date <= now() THEN
    RAISE EXCEPTION 'Rise smoke upgrade is unavailable';
  END IF;
  SELECT * INTO source_order FROM public.membership_payment_orders
    WHERE member_id = m.id AND user_id::text = p_user_id::text AND plan_id = general_plan.id
      AND purpose = 'tier' AND status = 'paid' AND is_smoke_test AND amount = 100 AND currency = 'INR'
    ORDER BY paid_at DESC NULLS LAST LIMIT 1;
  IF source_order.id IS NULL THEN RAISE EXCEPTION 'Rise smoke upgrade is unavailable'; END IF;

  SELECT * INTO o FROM public.membership_payment_orders WHERE is_smoke_test_upgrade FOR UPDATE;
  IF o.id IS NOT NULL THEN
    IF o.user_id::text = p_user_id::text AND o.plan_id = p.id AND o.status IN ('creating','pending') THEN
      RETURN to_jsonb(o) || jsonb_build_object('newly_created', false);
    END IF;
    RAISE EXCEPTION 'Rise smoke upgrade has already been used';
  END IF;
  SELECT * INTO o FROM public.membership_payment_orders WHERE member_id = m.id AND status IN ('creating','pending');
  IF o.id IS NOT NULL THEN RAISE EXCEPTION 'Complete the existing pending payment first'; END IF;

  INSERT INTO public.membership_payment_orders(
    member_id, user_id, plan_id, purpose, amount, upgrade_from_plan_id,
    upgrade_credit_source_order_id, upgrade_credit_amount, is_smoke_test_upgrade
  ) VALUES (m.id, p_user_id, p.id, 'tier', 200, general_plan.id, source_order.id, 0, true)
  RETURNING * INTO o;
  RETURN to_jsonb(o) || jsonb_build_object('newly_created', true);
END $$;
REVOKE ALL ON FUNCTION public.begin_membership_smoke_test_upgrade_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_smoke_test_upgrade_payment(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.settle_membership_payment(p_order_id text, p_payment_id text, p_amount bigint, p_currency text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  o public.membership_payment_orders%ROWTYPE;
  m public.members%ROWTYPE;
  p public.membership_plans%ROWTYPE;
  source_order public.membership_payment_orders%ROWTYPE;
  v_reason text;
  recon_id uuid;
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
         OR p.slug NOT IN ('rise-general','rise-premium') THEN
        v_reason := 'membership_payment_conflict';
      ELSIF o.is_smoke_test_upgrade THEN
        SELECT * INTO source_order FROM public.membership_payment_orders WHERE id = o.upgrade_credit_source_order_id;
        IF p.slug <> 'rise-premium' OR m.status <> 'active' OR m.plan_id <> o.upgrade_from_plan_id
           OR m.end_date IS NULL OR m.end_date <= now() OR o.amount <> 200
           OR source_order.id IS NULL OR source_order.member_id <> m.id OR source_order.user_id <> o.user_id
           OR NOT source_order.is_smoke_test OR source_order.status <> 'paid' OR source_order.amount <> 100
           OR source_order.plan_id <> o.upgrade_from_plan_id THEN v_reason := 'membership_payment_conflict'; END IF;
      ELSIF o.upgrade_from_plan_id IS NOT NULL THEN
        SELECT * INTO source_order FROM public.membership_payment_orders WHERE id = o.upgrade_credit_source_order_id;
        IF p.slug <> 'rise-premium' OR m.status <> 'active' OR m.plan_id <> o.upgrade_from_plan_id
           OR m.end_date IS NULL OR m.end_date <= now() OR o.amount <> p.price - o.upgrade_credit_amount
           OR o.upgrade_credit_amount <> COALESCE(source_order.amount, 0)
           OR (o.upgrade_credit_amount > 0 AND (source_order.id IS NULL OR source_order.member_id <> m.id
             OR source_order.user_id <> o.user_id OR source_order.plan_id <> o.upgrade_from_plan_id
             OR source_order.purpose <> 'tier' OR source_order.status <> 'paid' OR source_order.currency <> 'INR'
             OR source_order.is_smoke_test)) THEN v_reason := 'membership_payment_conflict'; END IF;
      ELSIF m.status = 'active' AND m.end_date IS NOT NULL AND m.end_date > now() THEN
        v_reason := 'membership_payment_conflict';
      ELSIF o.amount <> (CASE WHEN o.is_smoke_test THEN 100 ELSE p.price END) THEN
        v_reason := 'membership_payment_conflict';
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
  ELSIF o.upgrade_from_plan_id IS NOT NULL THEN
    -- Upgrading changes the tier without resetting the member's annual term.
    UPDATE public.members SET plan_id = o.plan_id, status = 'active' WHERE id = m.id;
  ELSE
    UPDATE public.members SET plan_id = o.plan_id, status = 'active', start_date = now(), end_date = now() + interval '1 year' WHERE id = m.id;
  END IF;
  RETURN jsonb_build_object('status','paid');
END $$;
REVOKE ALL ON FUNCTION public.settle_membership_payment(text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_membership_payment(text, text, bigint, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
