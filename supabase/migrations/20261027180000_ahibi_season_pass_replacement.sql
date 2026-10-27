-- Track the NUSC order pair for an AHIBI General-to-Premium pass replacement.
BEGIN;

ALTER TABLE public.membership_payment_orders
  ADD COLUMN ahibi_replaces_order_id uuid REFERENCES public.membership_payment_orders(id) ON DELETE RESTRICT,
  ADD COLUMN ahibi_replaced_by_order_id uuid REFERENCES public.membership_payment_orders(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX membership_one_ahibi_replacement_per_general_order
  ON public.membership_payment_orders (ahibi_replaces_order_id)
  WHERE ahibi_replaces_order_id IS NOT NULL AND status IN ('creating', 'pending', 'paid');
CREATE UNIQUE INDEX membership_general_order_replaced_once
  ON public.membership_payment_orders (ahibi_replaced_by_order_id)
  WHERE ahibi_replaced_by_order_id IS NOT NULL;

ALTER TABLE public.membership_payment_orders
  DROP CONSTRAINT IF EXISTS membership_payment_orders_ahibi_pass_status_check;
ALTER TABLE public.membership_payment_orders
  ADD CONSTRAINT membership_payment_orders_ahibi_pass_status_check CHECK (
    ahibi_pass_status IN ('not_required', 'reserving', 'held', 'issuing', 'issued', 'replaced',
      'release_pending', 'released', 'failed', 'refund_required', 'needs_reconciliation')
  );

COMMIT;
