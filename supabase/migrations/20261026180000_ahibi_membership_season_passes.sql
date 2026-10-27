-- Persist an Ahibi inventory hold and its ten issued tickets against the paid NUSC order.
BEGIN;

ALTER TABLE public.membership_payment_orders
    ADD COLUMN ahibi_reservation_id text,
    ADD COLUMN ahibi_pass_id text,
    ADD COLUMN ahibi_zone text,
    ADD COLUMN ahibi_pass_status text NOT NULL DEFAULT 'not_required'
        CHECK (ahibi_pass_status IN ('not_required', 'reserving', 'held', 'issuing', 'issued', 'release_pending', 'released', 'failed', 'refund_required', 'needs_reconciliation')),
    ADD COLUMN ahibi_reservation_expires_at timestamptz,
    ADD CONSTRAINT membership_payment_orders_ahibi_selection_check CHECK (
        (ahibi_pass_id IS NULL AND ahibi_zone IS NULL)
        OR (ahibi_pass_id = 'general-season' AND ahibi_zone IN ('G-1', 'G-2', 'G-3', 'G-4', 'G-5'))
        OR (ahibi_pass_id = 'premium-season' AND ahibi_zone IS NULL)
    );

CREATE UNIQUE INDEX membership_payment_orders_ahibi_reservation_unique
    ON public.membership_payment_orders(ahibi_reservation_id)
    WHERE ahibi_reservation_id IS NOT NULL;

CREATE TABLE public.membership_season_pass_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_order_id uuid NOT NULL REFERENCES public.membership_payment_orders(id) ON DELETE RESTRICT,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    ahibi_booking_id text NOT NULL UNIQUE CHECK (length(trim(ahibi_booking_id)) BETWEEN 1 AND 200),
    ahibi_event_id text NOT NULL CHECK (length(trim(ahibi_event_id)) BETWEEN 1 AND 200),
    match_date date NOT NULL,
    opponent text NOT NULL CHECK (length(trim(opponent)) BETWEEN 1 AND 160),
    ticket_type text NOT NULL CHECK (ticket_type IN ('General Pass', 'Premium Pass')),
    zone text CHECK (zone IS NULL OR zone IN ('G-1', 'G-2', 'G-3', 'G-4', 'G-5')),
    status text NOT NULL CHECK (status IN ('confirmed', 'cancelled', 'used')),
    ticket_access_path text NOT NULL CHECK (ticket_access_path LIKE '/api/nusc-partner/v1/reservations/%/tickets/%'),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (payment_order_id, ahibi_event_id)
);

CREATE INDEX membership_season_pass_tickets_member_order_idx
    ON public.membership_season_pass_tickets(member_id, payment_order_id, match_date);

ALTER TABLE public.membership_season_pass_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.membership_season_pass_tickets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.membership_season_pass_tickets TO service_role;

COMMIT;
