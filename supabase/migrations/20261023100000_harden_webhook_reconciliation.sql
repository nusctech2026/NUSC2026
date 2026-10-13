-- Migration: 20261023100000_harden_webhook_reconciliation.sql
-- Description: Enforce idempotency constraint and auditable refund fields on payment reconciliations

BEGIN;

-- 1. Ensure refund tracking columns exist for durable auditability
ALTER TABLE public.payment_reconciliations
ADD COLUMN IF NOT EXISTS refund_id VARCHAR,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ;

-- 2. Check for and guard against any pre-existing duplicates before constraint application
DO $$
DECLARE
    v_dup_count INTEGER;
BEGIN
    SELECT count(*) INTO v_dup_count
    FROM (
        SELECT duplicate_payment_id, reason
        FROM public.payment_reconciliations
        GROUP BY duplicate_payment_id, reason
        HAVING count(*) > 1
    ) sub;

    IF v_dup_count > 0 THEN
        RAISE EXCEPTION 'Cannot apply uniqueness constraint: % duplicate reconciliation groups exist in table', v_dup_count;
    END IF;
END $$;

-- 3. Add unique constraint and index on (duplicate_payment_id, reason)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payment_reconciliations_payment_reason'
    ) THEN
        ALTER TABLE public.payment_reconciliations
        ADD CONSTRAINT uq_payment_reconciliations_payment_reason UNIQUE (duplicate_payment_id, reason);
    END IF;
END $$;

COMMIT;
