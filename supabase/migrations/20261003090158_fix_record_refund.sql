CREATE OR REPLACE FUNCTION record_refund(
    p_order_id UUID,
    p_amount BIGINT,
    p_reason TEXT,
    p_admin_id UUID,
    p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_new_total_refunded BIGINT;
    v_payment_status TEXT;
    v_refund_id UUID;
BEGIN
    -- Idempotency check via webhook_events
    IF EXISTS (SELECT 1 FROM public.webhook_events WHERE provider_event_id = p_idempotency_key) THEN
        RETURN jsonb_build_object('success', true, 'message', 'Refund already recorded (idempotent)');
    END IF;

    -- Lock order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.total_refunded + p_amount > v_order.total_amount THEN
        RAISE EXCEPTION 'Refund amount exceeds remaining refundable amount';
    END IF;

    -- Insert refund record
    INSERT INTO public.refunds (order_id, amount, reason, status) 
    VALUES (p_order_id, p_amount, p_reason, 'completed') RETURNING id INTO v_refund_id;

    v_new_total_refunded := v_order.total_refunded + p_amount;
    
    IF v_new_total_refunded >= v_order.total_amount THEN
        v_payment_status := 'refunded';
    ELSE
        v_payment_status := v_order.payment_status; -- keep existing status, probably 'paid'
    END IF;

    UPDATE public.orders 
    SET total_refunded = v_new_total_refunded, payment_status = v_payment_status 
    WHERE id = p_order_id;

    -- Record idempotency key
    INSERT INTO public.webhook_events (provider, provider_event_id, event_type, payload, status)
    VALUES ('internal_refund', p_idempotency_key, 'refund.processed', jsonb_build_object('order_id', p_order_id, 'amount', p_amount), 'processed');

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        p_admin_id, 'record_refund', 'orders', p_order_id, 
        jsonb_build_object('total_refunded', v_order.total_refunded, 'payment_status', v_order.payment_status), 
        jsonb_build_object('total_refunded', v_new_total_refunded, 'payment_status', v_payment_status, 'refund_id', v_refund_id)
    );

    RETURN jsonb_build_object('success', true, 'refund_id', v_refund_id, 'payment_status', v_payment_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
