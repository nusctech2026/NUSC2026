-- Update the Rise Premium listed total. A retry through the current app replaces a
-- stale pending order after checking Razorpay; captured prior-price orders still settle.
BEGIN;

DO $$
DECLARE
  current_price bigint;
BEGIN
  SELECT price INTO current_price
  FROM public.membership_plans
  WHERE slug = 'rise-premium'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rise Premium membership plan is missing';
  END IF;

  IF current_price IS DISTINCT FROM 1622500 THEN
    RAISE EXCEPTION 'Rise Premium price changed before this migration; review the live plan first';
  END IF;
END $$;

UPDATE public.membership_plans
SET price = 1947000
WHERE slug = 'rise-premium';

-- Keep the payment, smoke-test, settlement and authorization logic intact. Reject
-- stale prior-price orders for new checkout attempts while retaining their old
-- amount in settlement so a captured in-flight payment can still be honored.
DO $$
DECLARE
  definition text;
BEGIN
  definition := pg_get_functiondef('public.begin_membership_payment(uuid, uuid)'::regprocedure);
  IF strpos(definition, 'WHEN ''rise-premium'' THEN 1622500') = 0
     OR strpos(definition, 'o.amount = v_amount OR (p.slug = ''rise-premium'' AND o.amount + o.upgrade_credit_amount = 1298000)') = 0 THEN
    RAISE EXCEPTION 'begin_membership_payment definition changed; review the Rise Premium pricing migration';
  END IF;
  definition := replace(definition,
    'WHEN ''rise-premium'' THEN 1622500',
    'WHEN ''rise-premium'' THEN 1947000');
  definition := replace(definition,
    'o.amount = v_amount OR (p.slug = ''rise-premium'' AND o.amount + o.upgrade_credit_amount = 1298000)',
    'o.amount = v_amount');
  EXECUTE definition;

  definition := pg_get_functiondef('public.begin_membership_smoke_test_payment(uuid, uuid)'::regprocedure);
  IF strpos(definition, 'payment_order.amount IN (389400, 1622500)') = 0 THEN
    RAISE EXCEPTION 'begin_membership_smoke_test_payment definition changed; review the Rise Premium pricing migration';
  END IF;
  definition := replace(definition,
    'payment_order.amount IN (389400, 1622500)',
    'payment_order.amount IN (389400, 1622500, 1947000)');
  EXECUTE definition;

  definition := pg_get_functiondef('public.begin_membership_smoke_test_upgrade_payment(uuid, uuid)'::regprocedure);
  IF strpos(definition, 'p.price <> 1622500') = 0 THEN
    RAISE EXCEPTION 'begin_membership_smoke_test_upgrade_payment definition changed; review the Rise Premium pricing migration';
  END IF;
  definition := replace(definition, 'p.price <> 1622500', 'p.price <> 1947000');
  EXECUTE definition;

  definition := pg_get_functiondef('public.settle_membership_payment(text, text, bigint, text)'::regprocedure);
  IF strpos(definition, 'o.amount + o.upgrade_credit_amount = 1298000') = 0
     OR strpos(definition, 'o.amount = 1298000') = 0 THEN
    RAISE EXCEPTION 'settle_membership_payment definition changed; review the Rise Premium pricing migration';
  END IF;
  definition := replace(definition,
    'o.amount + o.upgrade_credit_amount = 1298000',
    'o.amount + o.upgrade_credit_amount IN (1298000, 1622500)');
  definition := replace(definition,
    'o.amount = 1298000',
    'o.amount IN (1298000, 1622500)');
  EXECUTE definition;
END $$;

REVOKE ALL ON FUNCTION public.begin_membership_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_payment(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.begin_membership_smoke_test_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_smoke_test_payment(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.begin_membership_smoke_test_upgrade_payment(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_membership_smoke_test_upgrade_payment(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.settle_membership_payment(text, text, bigint, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_membership_payment(text, text, bigint, text) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
