-- Standalone AHIBI season passes booked manually for eligible RISE members.
-- Already applied to production; preserve this source and do not rerun it.

BEGIN;

CREATE TABLE public.membership_ahibi_manual_pass_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE CHECK (length(trim(request_id)) BETWEEN 16 AND 100),
  season_id text NOT NULL DEFAULT 'nusc-il-2026-27',
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  membership_number text NOT NULL,
  pass_id text NOT NULL CHECK (pass_id IN ('general-season', 'premium-season')),
  ticket_type text NOT NULL CHECK (ticket_type IN ('General Pass', 'Premium Pass')),
  zone text CHECK (zone IS NULL OR zone IN ('G-1', 'G-2', 'G-3', 'G-4', 'G-5')),
  list_amount_paise bigint NOT NULL CHECK (list_amount_paise > 0),
  settled_amount_paise bigint CHECK (settled_amount_paise IS NULL OR settled_amount_paise >= 0),
  settlement_type text CHECK (settlement_type IS NULL OR settlement_type IN ('paid', 'complimentary')),
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('Cash', 'Card', 'UPI')),
  payment_reference text CHECK (payment_reference IS NULL OR length(payment_reference) <= 120),
  complimentary_reason text CHECK (complimentary_reason IS NULL OR length(complimentary_reason) BETWEEN 5 AND 500),
  settlement_hash text CHECK (settlement_hash IS NULL OR settlement_hash ~ '^[a-f0-9]{64}$'),
  created_by_ahibi_admin_id text NOT NULL CHECK (length(trim(created_by_ahibi_admin_id)) BETWEEN 1 AND 120),
  settled_by_ahibi_admin_id text,
  status text NOT NULL DEFAULT 'reserving'
    CHECK (status IN ('reserving', 'reserved', 'settling', 'issued', 'needs_reconciliation', 'failed', 'cancelled')),
  ahibi_pass_status text NOT NULL DEFAULT 'reserving'
    CHECK (ahibi_pass_status IN ('reserving', 'held', 'issuing', 'issued', 'released', 'failed', 'needs_reconciliation')),
  ahibi_reservation_id text UNIQUE,
  ahibi_partner_order_id text,
  ahibi_reservation_expires_at timestamptz,
  error_code text,
  audit jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  issued_at timestamptz,
  CONSTRAINT membership_ahibi_manual_pass_selection_check CHECK (
    (pass_id = 'general-season' AND ticket_type = 'General Pass'
      AND (zone IS NULL OR zone IN ('G-1', 'G-2', 'G-3', 'G-4', 'G-5')))
    OR (pass_id = 'premium-season' AND ticket_type = 'Premium Pass' AND zone IS NULL)
  ),
  CONSTRAINT membership_ahibi_manual_pass_settlement_check CHECK (
    (
      settlement_type IS NULL AND payment_method IS NULL AND payment_reference IS NULL
      AND settled_amount_paise IS NULL AND complimentary_reason IS NULL
      AND settlement_hash IS NULL AND settled_by_ahibi_admin_id IS NULL AND settled_at IS NULL
    )
    OR (
      settlement_type IS NOT NULL AND settlement_type = 'paid' AND settled_amount_paise IS NOT NULL
      AND settled_amount_paise = list_amount_paise
      AND payment_method IS NOT NULL AND payment_method IN ('Cash', 'Card', 'UPI')
      AND complimentary_reason IS NULL
      AND settlement_hash IS NOT NULL AND settled_by_ahibi_admin_id IS NOT NULL
      AND length(trim(settled_by_ahibi_admin_id)) BETWEEN 1 AND 120
      AND settled_at IS NOT NULL
    )
    OR (
      settlement_type IS NOT NULL AND settlement_type = 'complimentary' AND settled_amount_paise IS NOT NULL
      AND settled_amount_paise = 0 AND payment_method IS NULL AND payment_reference IS NULL
      AND complimentary_reason IS NOT NULL
      AND length(trim(complimentary_reason)) BETWEEN 5 AND 500
      AND settlement_hash IS NOT NULL AND settled_by_ahibi_admin_id IS NOT NULL
      AND length(trim(settled_by_ahibi_admin_id)) BETWEEN 1 AND 120
      AND settled_at IS NOT NULL
    )
  ),
  CONSTRAINT membership_ahibi_manual_pass_issued_state_check CHECK (
    status <> 'issued'
    OR (settlement_type IS NOT NULL AND ahibi_pass_status = 'issued' AND issued_at IS NOT NULL)
  )
);

CREATE INDEX membership_ahibi_manual_pass_member_idx
  ON public.membership_ahibi_manual_pass_orders(member_id, created_at DESC);
CREATE INDEX membership_ahibi_manual_pass_status_idx
  ON public.membership_ahibi_manual_pass_orders(status, created_at DESC);
CREATE UNIQUE INDEX membership_ahibi_manual_pass_member_pass_active_uidx
  ON public.membership_ahibi_manual_pass_orders(member_id, pass_id, season_id)
  WHERE status IN ('reserving', 'reserved', 'settling', 'issued', 'needs_reconciliation');

ALTER TABLE public.membership_ahibi_manual_pass_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_ahibi_manual_pass_orders FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_ahibi_manual_pass_orders TO service_role;

ALTER TABLE public.membership_season_pass_tickets
  ALTER COLUMN payment_order_id DROP NOT NULL,
  ADD COLUMN manual_order_id uuid REFERENCES public.membership_ahibi_manual_pass_orders(id) ON DELETE RESTRICT,
  ADD CONSTRAINT membership_season_pass_ticket_order_owner_check
    CHECK ((payment_order_id IS NULL) <> (manual_order_id IS NULL));

CREATE UNIQUE INDEX membership_season_pass_tickets_manual_order_event_uidx
  ON public.membership_season_pass_tickets(manual_order_id, ahibi_event_id)
  WHERE manual_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS member_profiles_phone_idx
  ON public.member_profiles(phone);

COMMIT;
