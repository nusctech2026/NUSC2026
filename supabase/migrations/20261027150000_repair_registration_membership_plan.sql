-- Keep the free registration plan required by account signup available.
-- Preserve an existing plan row and its member/benefit references when adopting
-- the legacy base-membership slug.
BEGIN;

DO $$
DECLARE
    registration_plan_id uuid;
    legacy_plan_id uuid;
BEGIN
    SELECT id
      INTO registration_plan_id
      FROM public.membership_plans
     WHERE slug = 'registration'
     LIMIT 1;

    IF registration_plan_id IS NULL THEN
        SELECT id
          INTO legacy_plan_id
          FROM public.membership_plans
         WHERE lower(trim(slug)) = 'base-membership'
         ORDER BY created_at, id
         LIMIT 1;

        IF legacy_plan_id IS NOT NULL THEN
            UPDATE public.membership_plans
               SET slug = 'registration'
             WHERE id = legacy_plan_id;
        END IF;
    END IF;
END;
$$;

INSERT INTO public.membership_plans
    (name, slug, price, billing_cycle, is_purchasable_online, is_active)
VALUES
    ('Registered Member', 'registration', 1000, 'annual', false, true)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        price = EXCLUDED.price,
        billing_cycle = EXCLUDED.billing_cycle,
        is_purchasable_online = EXCLUDED.is_purchasable_online,
        is_active = true;

COMMIT;
