-- Phase 1 Transactional Hardening

-- 1. adjust_inventory
CREATE OR REPLACE FUNCTION adjust_inventory(
    p_variant_id UUID,
    p_delta INTEGER,
    p_reason TEXT,
    p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_variant RECORD;
    v_new_stock INTEGER;
BEGIN
    IF p_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin ID required for audit logging';
    END IF;

    -- Row level lock
    SELECT * INTO v_variant FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Variant not found';
    END IF;

    v_new_stock := v_variant.stock_quantity + p_delta;
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'Cannot reduce stock below zero';
    END IF;

    UPDATE public.product_variants SET stock_quantity = v_new_stock WHERE id = p_variant_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        p_admin_id, 
        'inventory_adjust', 
        'product_variants', 
        p_variant_id, 
        jsonb_build_object('stock_quantity', v_variant.stock_quantity), 
        jsonb_build_object('stock_quantity', v_new_stock, 'delta', p_delta, 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'new_stock', v_new_stock);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. process_return
CREATE OR REPLACE FUNCTION process_return(
    p_order_id UUID,
    p_item_id UUID,
    p_quantity INTEGER,
    p_variant_id UUID,
    p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_variant RECORD;
    v_current_returned INTEGER;
    v_new_returned INTEGER;
    v_all_returned BOOLEAN;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Quantity must be positive';
    END IF;

    -- Lock item
    SELECT * INTO v_item FROM public.order_items WHERE id = p_item_id AND order_id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;

    v_current_returned := COALESCE(v_item.quantity_returned, 0);
    v_new_returned := v_current_returned + p_quantity;

    IF v_new_returned > v_item.quantity THEN
        RAISE EXCEPTION 'Cannot return more than purchased quantity';
    END IF;

    UPDATE public.order_items SET quantity_returned = v_new_returned WHERE id = p_item_id;

    -- Lock and restore variant stock
    IF p_variant_id IS NOT NULL THEN
        SELECT * INTO v_variant FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
        IF FOUND THEN
            UPDATE public.product_variants SET stock_quantity = stock_quantity + p_quantity WHERE id = p_variant_id;
        END IF;
    END IF;

    -- Check if entire order is now returned
    SELECT bool_and(quantity_returned >= quantity) INTO v_all_returned FROM public.order_items WHERE order_id = p_order_id;
    
    IF v_all_returned THEN
        UPDATE public.orders SET fulfillment_status = 'returned' WHERE id = p_order_id;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        p_admin_id, 'process_return', 'order_items', p_item_id, 
        jsonb_build_object('quantity_returned', v_current_returned), 
        jsonb_build_object('quantity_returned', v_new_returned, 'order_id', p_order_id)
    );

    RETURN jsonb_build_object('success', true, 'quantity_returned', v_new_returned, 'fully_returned', COALESCE(v_all_returned, false));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. cancel_order
CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id UUID,
    p_reason TEXT,
    p_admin_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    -- Lock order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.fulfillment_status = 'fulfilled' THEN
        RAISE EXCEPTION 'Cannot cancel a fulfilled order. Process a return instead.';
    END IF;
    IF v_order.fulfillment_status = 'cancelled' THEN
        RAISE EXCEPTION 'Order is already cancelled.';
    END IF;
    IF v_order.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Cannot cancel a paid order directly. Issue a refund first or simultaneously.';
    END IF;

    -- Restore inventory for unfulfilled order items
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id FOR UPDATE LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants 
            SET stock_quantity = stock_quantity + (v_item.quantity - COALESCE(v_item.quantity_returned, 0)) 
            WHERE id = v_item.variant_id;
        END IF;
    END LOOP;

    -- Update order status
    UPDATE public.orders 
    SET fulfillment_status = 'cancelled', payment_status = 'cancelled', updated_at = now() 
    WHERE id = p_order_id;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (
        p_admin_id, 'cancel_order', 'orders', p_order_id, 
        jsonb_build_object('fulfillment_status', v_order.fulfillment_status, 'payment_status', v_order.payment_status), 
        jsonb_build_object('fulfillment_status', 'cancelled', 'payment_status', 'cancelled', 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. record_refund (Idempotent)
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
    -- Idempotency check via webhook_events (or a dedicated idempotency mechanism)
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
        v_payment_status := 'partially_refunded';
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
