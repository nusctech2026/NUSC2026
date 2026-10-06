-- E-Commerce Schema for NUSC Store (Streamlined for small-medium scale)

-- Admin Roles Table (For RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'store_manager', 'content_editor', 'fulfillment_staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- Unique constraint replaced by partial index below
    description TEXT,
    seo_title TEXT,
    seo_description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0 CHECK (tax_rate >= 0),
    is_tax_inclusive BOOLEAN DEFAULT true,
    base_price BIGINT NOT NULL CHECK (base_price >= 0), -- Stored in minor units
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    display_order INTEGER NOT NULL DEFAULT 0 CHECK (display_order >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Product Variants Table (for sizes, colors, inventory)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    options JSONB, -- e.g. {"Size": "M", "Color": "Red"} or empty for default variant
    sku TEXT NOT NULL, -- Unique constraint replaced by partial index below
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    price_override BIGINT CHECK (price_override >= 0),
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, -- Unique constraint replaced by partial index below
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    amount_off BIGINT CHECK (amount_off > 0),
    percent_off DECIMAL(5, 2) CHECK (percent_off > 0 AND percent_off <= 100),
    CHECK ((discount_type = 'fixed' AND amount_off IS NOT NULL AND percent_off IS NULL) OR 
           (discount_type = 'percentage' AND percent_off IS NOT NULL AND amount_off IS NULL)),
    min_order_value BIGINT DEFAULT 0 CHECK (min_order_value >= 0),
    max_uses INTEGER,
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
    CHECK (max_uses IS NULL OR usage_count <= max_uses), -- Critically prevents race conditions
    per_user_limit INTEGER DEFAULT 1 CHECK (per_user_limit > 0),
    restricted_to_product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    restricted_to_category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sequence for human-readable order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10000;

-- Orders Table
-- Simplified: No separate shipments or returns tables. Tracked natively here.
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL DEFAULT 'NUSC-' || nextval('public.order_number_seq'::regclass),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email_snapshot TEXT NOT NULL, -- Preserves user identity for tax auditing if user_id is set to NULL (deleted)
    idempotency_key UUID UNIQUE,
    provider_order_id TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'fulfilled', 'cancelled', 'returned', 'exception')),
    subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
    tax_amount BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_amount BIGINT NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
    discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
    CHECK (total_amount = GREATEST(0, subtotal + tax_amount + shipping_amount - discount_amount)), -- Ensures order math integrity
    total_refunded BIGINT NOT NULL DEFAULT 0 CHECK (total_refunded >= 0 AND total_refunded <= total_amount),
    checkout_session_id TEXT UNIQUE,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    shipping_address JSONB,
    tracking_number TEXT, -- Consolidated from shipments
    paid_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Coupon Redemptions Table (Tracks usage to enforce per-user limits)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(coupon_id, order_id)
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    variant_sku_snapshot TEXT NOT NULL,
    variant_options_snapshot JSONB,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase BIGINT NOT NULL CHECK (price_at_purchase >= 0),
    tax_rate_snapshot DECIMAL(5, 2) DEFAULT 0,
    is_tax_inclusive_snapshot BOOLEAN DEFAULT false,
    tax_amount BIGINT DEFAULT 0 CHECK (tax_amount >= 0),
    quantity_returned INTEGER NOT NULL DEFAULT 0 CHECK (quantity_returned >= 0 AND quantity_returned <= quantity), -- Replaces returns tables
    amount_refunded BIGINT NOT NULL DEFAULT 0 CHECK (amount_refunded >= 0 AND amount_refunded <= (price_at_purchase * quantity) + tax_amount),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments Table (1 Order to Many Payment Attempts)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'stripe', 'razorpay'
    provider_payment_id TEXT NOT NULL, -- e.g., Stripe PaymentIntent ID
    amount BIGINT NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(provider, provider_payment_id)
);

-- Refunds Table (Financial)
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL, -- The specific payment transaction refunded
    amount BIGINT NOT NULL CHECK (amount > 0),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit Logs Table (Immutable append-only ledger for admin actions)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'update_price', 'refund_order'
    entity_type TEXT NOT NULL, -- e.g., 'products', 'orders'
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Webhook Events Table (For Idempotency and Retries)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(provider, provider_event_id)
);


-- Row Level Security (RLS) setup
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- RLS Helper Functions
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_role(p_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = ANY(p_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.has_role(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT[]) TO authenticated, anon;

-- Admin Policies (Grants access to authorized roles)
CREATE POLICY "Store managers and content editors can manage categories" ON public.categories FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor']));
CREATE POLICY "Store managers and content editors can manage products" ON public.products FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor']));
CREATE POLICY "Store managers and content editors can manage product images" ON public.product_images FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor']));
CREATE POLICY "Store managers and content editors can manage variants" ON public.product_variants FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor']));
CREATE POLICY "Store managers can manage coupons" ON public.coupons FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager']));

-- Fine-grained Order & Financial Policies
CREATE POLICY "Staff can view and update orders" ON public.orders FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager', 'fulfillment_staff']));

CREATE POLICY "Store managers can manage refunds" ON public.refunds FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager']));

-- Audit Log Policies (Immutable)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor']));
-- Audit logs are inserted strictly via the service_role and log_audit_event RPC

-- Public Policies
CREATE POLICY "Public categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (is_archived = false);
CREATE POLICY "Public product images are viewable by everyone" ON public.product_images FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products WHERE id = product_images.product_id AND is_archived = false)
);
CREATE POLICY "Public variants are viewable by everyone" ON public.product_variants FOR SELECT USING (is_archived = false AND EXISTS (SELECT 1 FROM public.products WHERE id = product_variants.product_id AND is_archived = false));
-- Active coupons are now queried only by the server or validation RPC

-- Users can view their own roles (so frontend knows if they are an admin)
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Orders are readable only by the user who owns them. NO client-side inserts allowed (must be server-side).
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);
CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager', 'fulfillment_staff']));

-- Coupon Redemptions are strictly for the user (read-only client-side)
CREATE POLICY "Users can view their own coupon redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);

-- Payments and Refunds are read-only for users. ONLY the server can insert/update via service_role key.
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = payments.order_id AND user_id = auth.uid())
);
CREATE POLICY "Staff can view payments" ON public.payments FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager', 'fulfillment_staff']));
CREATE POLICY "Users can view their own refunds" ON public.refunds FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = refunds.order_id AND user_id = auth.uid())
);


--------------------------------------------------------------------------------
-- Inventory RPCs (Transactional Safety)
--------------------------------------------------------------------------------

-- 1. Checkout / Decrement Stock
CREATE OR REPLACE FUNCTION decrement_stock(p_variant_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) TO service_role;

-- 2. Restock (Used for Cancellations/Returns)
CREATE OR REPLACE FUNCTION restock_variant(p_variant_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    IF p_quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + p_quantity
    WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.restock_variant(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restock_variant(UUID, INTEGER) TO service_role;

-- 3. Create Order from Cart Array (Secure Pricing, Atomic Inventory, Coupons)
-- Accepts an array of items, calculates true prices natively, and generates the order.
DROP FUNCTION IF EXISTS public.create_order(JSONB, JSONB, BIGINT, UUID, UUID);

CREATE OR REPLACE FUNCTION create_order(p_user_id UUID, p_user_email TEXT, p_shipping_address JSONB, p_items JSONB, p_shipping_amount BIGINT DEFAULT 0, p_coupon_id UUID DEFAULT NULL, p_idempotency_key UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_subtotal BIGINT := 0;
    v_total_tax BIGINT := 0;
    v_discount_amount BIGINT := 0;
    v_total_amount BIGINT;
    item RECORD;
    v_variant RECORD;
    v_coupon RECORD;
    v_user_coupon_usage INTEGER;
    v_prepared_items JSONB := '[]'::JSONB;
BEGIN
    IF p_shipping_amount < 0 THEN RAISE EXCEPTION 'Shipping amount must be positive'; END IF;
    IF jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION 'Invalid items array';
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key::text));
        SELECT id INTO v_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key AND user_id = p_user_id;
        IF FOUND THEN RETURN v_order_id; END IF;
    END IF;

    -- Normalize duplicate variants and iterate
    FOR item IN 
        WITH items AS (
            SELECT (value->>'variant_id')::UUID as variant_id, (value->>'quantity')::INTEGER as quantity
            FROM jsonb_array_elements(p_items)
        )
        SELECT variant_id, SUM(quantity)::INTEGER as quantity FROM items GROUP BY variant_id ORDER BY variant_id
    LOOP
        SELECT pv.id, pv.price_override, p.base_price, p.tax_rate, p.is_tax_inclusive, p.name, pv.sku, pv.options, pv.stock_quantity, p.category_id, p.id as product_id
        INTO v_variant
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = item.variant_id 
        AND pv.is_archived = false 
        AND p.is_archived = false
        FOR UPDATE OF pv;
        
        IF NOT FOUND THEN RAISE EXCEPTION 'Variant % not found or is archived', item.variant_id; END IF;

        DECLARE
            v_price BIGINT := COALESCE(v_variant.price_override, v_variant.base_price);
            v_line_total BIGINT := v_price * item.quantity;
            v_tax_amount BIGINT := 0;
        BEGIN
            IF item.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be positive'; END IF;
            IF v_variant.stock_quantity < item.quantity THEN
                RAISE EXCEPTION 'Insufficient stock for variant %', v_variant.id;
            END IF;

            IF v_variant.is_tax_inclusive THEN
                v_tax_amount := ROUND(v_line_total - (v_line_total / (1 + (v_variant.tax_rate / 100))))::BIGINT;
                v_subtotal := v_subtotal + (v_line_total - v_tax_amount);
            ELSE
                v_tax_amount := ROUND(v_line_total * (v_variant.tax_rate / 100))::BIGINT;
                v_subtotal := v_subtotal + v_line_total;
            END IF;

            v_total_tax := v_total_tax + v_tax_amount;

            v_prepared_items := v_prepared_items || jsonb_build_object(
                'variant_id', v_variant.id, 'name', v_variant.name, 'sku', v_variant.sku, 'options', COALESCE(v_variant.options, '{}'::jsonb),
                'qty', item.quantity, 'price', v_price, 'tax_rate', v_variant.tax_rate, 'tax_amt', v_tax_amount, 'is_inclusive', v_variant.is_tax_inclusive,
                'product_id', v_variant.product_id, 'category_id', v_variant.category_id
            );
        END;
    END LOOP;

    IF p_coupon_id IS NOT NULL THEN
        SELECT * INTO v_coupon FROM public.coupons WHERE id = p_coupon_id AND is_active = true AND (expires_at IS NULL OR expires_at > now());
        IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired coupon'; END IF;
        
        IF v_subtotal < v_coupon.min_order_value THEN RAISE EXCEPTION 'Order does not meet minimum value for coupon'; END IF;
        
        -- Check product/category restrictions
        IF v_coupon.restricted_to_product_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_prepared_items) WHERE (value->>'product_id')::UUID = v_coupon.restricted_to_product_id) THEN
            RAISE EXCEPTION 'Coupon is restricted to a specific product';
        END IF;
        IF v_coupon.restricted_to_category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_prepared_items) WHERE (value->>'category_id')::UUID = v_coupon.restricted_to_category_id) THEN
            RAISE EXCEPTION 'Coupon is restricted to a specific category';
        END IF;

        IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN
            RAISE EXCEPTION 'Coupon usage limit reached';
        END IF;

        SELECT COUNT(*) INTO v_user_coupon_usage FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id AND user_id = p_user_id;
        IF v_user_coupon_usage >= v_coupon.per_user_limit THEN
            RAISE EXCEPTION 'Coupon usage limit exceeded for this user';
        END IF;

        DECLARE
            v_eligible_amount BIGINT := 0;
            v_item_elem JSONB;
            v_item_gross BIGINT;
        BEGIN
            IF v_coupon.restricted_to_product_id IS NOT NULL OR v_coupon.restricted_to_category_id IS NOT NULL THEN
                FOR v_item_elem IN SELECT * FROM jsonb_array_elements(v_prepared_items) LOOP
                    IF (v_coupon.restricted_to_product_id IS NULL OR (v_item_elem->>'product_id')::UUID = v_coupon.restricted_to_product_id) AND
                       (v_coupon.restricted_to_category_id IS NULL OR (v_item_elem->>'category_id')::UUID = v_coupon.restricted_to_category_id) THEN
                        
                        v_item_gross := (v_item_elem->>'price')::BIGINT * (v_item_elem->>'qty')::INTEGER;
                        IF NOT (v_item_elem->>'is_inclusive')::BOOLEAN THEN
                            v_item_gross := v_item_gross + (v_item_elem->>'tax_amt')::BIGINT;
                        END IF;
                        v_eligible_amount := v_eligible_amount + v_item_gross;
                    END IF;
                END LOOP;
            ELSE
                v_eligible_amount := v_subtotal + v_total_tax;
            END IF;

            IF v_coupon.discount_type = 'fixed' THEN
                v_discount_amount := LEAST(v_coupon.amount_off, v_eligible_amount);
            ELSIF v_coupon.discount_type = 'percentage' THEN
                v_discount_amount := (v_eligible_amount * v_coupon.percent_off / 100)::BIGINT;
            END IF;
        END;
    END IF;

    v_total_amount := GREATEST(0, v_subtotal + v_total_tax + p_shipping_amount - v_discount_amount);
    v_order_id := gen_random_uuid();

    INSERT INTO public.orders (id, user_id, user_email_snapshot, shipping_address, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, idempotency_key, coupon_id)
    VALUES (v_order_id, p_user_id, p_user_email, p_shipping_address, v_subtotal, v_total_tax, p_shipping_amount, v_discount_amount, v_total_amount, p_idempotency_key, p_coupon_id);

    INSERT INTO public.order_items (order_id, variant_id, product_name_snapshot, variant_sku_snapshot, variant_options_snapshot, quantity, price_at_purchase, tax_rate_snapshot, is_tax_inclusive_snapshot, tax_amount)
    SELECT v_order_id, (value->>'variant_id')::UUID, value->>'name', value->>'sku', (value->>'options')::JSONB, (value->>'qty')::INTEGER, (value->>'price')::BIGINT, (value->>'tax_rate')::DECIMAL, (value->>'is_inclusive')::BOOLEAN, (value->>'tax_amt')::BIGINT
    FROM jsonb_array_elements(v_prepared_items);

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB, JSONB, BIGINT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT, JSONB, JSONB, BIGINT, UUID, UUID) TO service_role;

DROP FUNCTION IF EXISTS public.confirm_order_payment(UUID, TEXT, TEXT);

-- Payment Confirmation (Secure Webhook Execution)
CREATE OR REPLACE FUNCTION confirm_order_payment(p_order_id UUID, p_provider TEXT, p_provider_order_id TEXT, p_provider_payment_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_coupon RECORD;
    v_stock_ok BOOLEAN := true;
    v_coupon_ok BOOLEAN := true;
    v_usage_count INTEGER;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
    IF v_order.payment_status = 'paid' THEN RETURN; END IF;

    -- 1. Check stock with locks (deterministic order)
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY variant_id LOOP
        PERFORM 1 FROM public.product_variants WHERE id = v_item.variant_id AND stock_quantity >= v_item.quantity FOR UPDATE;
        IF NOT FOUND THEN v_stock_ok := false; END IF;
    END LOOP;

    -- 2. Check coupon with locks
    IF v_order.coupon_id IS NOT NULL THEN
        SELECT * INTO v_coupon FROM public.coupons WHERE id = v_order.coupon_id FOR UPDATE;
        IF v_coupon.max_uses IS NOT NULL AND v_coupon.usage_count >= v_coupon.max_uses THEN v_coupon_ok := false; END IF;
        SELECT COUNT(*) INTO v_usage_count FROM public.coupon_redemptions WHERE coupon_id = v_order.coupon_id AND user_id = v_order.user_id;
        IF v_usage_count >= COALESCE(v_coupon.per_user_limit, 1) THEN v_coupon_ok := false; END IF;
    END IF;

    -- 3. Handle failure cases (payment succeeded, but inventory/coupon unavailable)
    IF NOT v_stock_ok OR NOT v_coupon_ok THEN
        UPDATE public.orders 
        SET payment_status = 'paid', fulfillment_status = 'exception', paid_at = now(), provider_order_id = p_provider_order_id 
        WHERE id = p_order_id;
        
        INSERT INTO public.payments (order_id, provider, provider_payment_id, amount, status, error_message)
        VALUES (p_order_id, p_provider, p_provider_payment_id, v_order.total_amount, 'succeeded', 'Payment succeeded but inventory or coupon was unavailable');
        RETURN;
    END IF;

    -- 4. Apply success
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id ORDER BY variant_id LOOP
        UPDATE public.product_variants SET stock_quantity = stock_quantity - v_item.quantity WHERE id = v_item.variant_id;
    END LOOP;

    UPDATE public.orders SET payment_status = 'paid', paid_at = now(), provider_order_id = p_provider_order_id WHERE id = p_order_id;
    
    INSERT INTO public.payments (order_id, provider, provider_payment_id, amount, status)
    VALUES (p_order_id, p_provider, p_provider_payment_id, v_order.total_amount, 'succeeded');

    IF v_order.coupon_id IS NOT NULL THEN
        UPDATE public.coupons SET usage_count = usage_count + 1 WHERE id = v_order.coupon_id;
        INSERT INTO public.coupon_redemptions (coupon_id, user_id, order_id) VALUES (v_order.coupon_id, v_order.user_id, p_order_id) ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, TEXT) TO service_role;

-- Fulfillment RPC
CREATE OR REPLACE FUNCTION fulfill_order(p_order_id UUID, p_tracking_number TEXT)
RETURNS VOID AS $$
BEGIN
    IF NOT public.has_role(ARRAY['super_admin', 'store_manager', 'fulfillment_staff']) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    UPDATE public.orders SET fulfillment_status = 'fulfilled', tracking_number = p_tracking_number, shipped_at = now() 
    WHERE id = p_order_id AND payment_status = 'paid' AND fulfillment_status = 'unfulfilled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.fulfill_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_order(UUID, TEXT) TO authenticated;

-- 5. GDPR Anonymization Trigger
CREATE OR REPLACE FUNCTION anonymize_order_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL AND OLD.user_id IS NOT NULL THEN
        NEW.user_email_snapshot = 'anonymized@deleted.user';
        IF OLD.shipping_address IS NOT NULL THEN
            NEW.shipping_address = jsonb_build_object(
                'city', OLD.shipping_address->>'city',
                'state', OLD.shipping_address->>'state',
                'postal_code', OLD.shipping_address->>'postal_code',
                'country', OLD.shipping_address->>'country'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.anonymize_order_on_user_delete() FROM PUBLIC;

-- 6. Coupon Per-User Limit Enforcement
CREATE OR REPLACE FUNCTION enforce_coupon_per_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_usage_count INTEGER;
    v_per_user_limit INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_usage_count FROM public.coupon_redemptions
    WHERE coupon_id = NEW.coupon_id AND user_id = NEW.user_id;
    
    SELECT per_user_limit INTO v_per_user_limit FROM public.coupons WHERE id = NEW.coupon_id;
    
    IF v_usage_count >= v_per_user_limit THEN
        RAISE EXCEPTION 'Coupon usage limit exceeded for this user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.enforce_coupon_per_user_limit() FROM PUBLIC;

-- 7. Protect Financial Fields Trigger
CREATE OR REPLACE FUNCTION protect_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.subtotal IS DISTINCT FROM NEW.subtotal OR OLD.total_amount IS DISTINCT FROM NEW.total_amount OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR OLD.tax_amount IS DISTINCT FROM NEW.tax_amount OR OLD.shipping_amount IS DISTINCT FROM NEW.shipping_amount 
        OR OLD.payment_status IS DISTINCT FROM NEW.payment_status OR OLD.paid_at IS DISTINCT FROM NEW.paid_at OR OLD.user_id IS DISTINCT FROM NEW.user_id OR OLD.coupon_id IS DISTINCT FROM NEW.coupon_id OR OLD.idempotency_key IS DISTINCT FROM NEW.idempotency_key) THEN
        IF NOT public.has_role(ARRAY['super_admin']) AND coalesce(current_setting('role', true), '') != 'service_role' AND SESSION_USER != 'supabase_auth_admin' THEN
            RAISE EXCEPTION 'Only super admins can modify core/financial fields on orders';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.protect_financial_fields() FROM PUBLIC;

--------------------------------------------------------------------------------
-- Database Grants (Least Privilege)
--------------------------------------------------------------------------------

REVOKE ALL ON 
    public.user_roles, public.categories, public.products, public.product_images, public.product_variants, 
    public.coupons, public.coupon_redemptions, public.orders, public.order_items, 
    public.payments, public.refunds, public.webhook_events, public.audit_logs 
FROM anon, authenticated;

-- Anon (Public/Guests)
GRANT SELECT ON public.categories, public.products, public.product_images, public.product_variants TO anon;

-- Authenticated (Logged-in Customers)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.categories, public.products, public.product_images, public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.products, public.product_images, public.product_variants, public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT SELECT ON public.orders, public.order_items, public.payments, public.refunds TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

--------------------------------------------------------------------------------
-- Controlled RPCs for Private Resources
--------------------------------------------------------------------------------

-- Coupon Validation
CREATE OR REPLACE FUNCTION validate_coupon(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_coupon RECORD;
BEGIN
    SELECT id, code, discount_type, amount_off, percent_off, min_order_value, restricted_to_product_id, restricted_to_category_id 
    INTO v_coupon 
    FROM public.coupons 
    WHERE code = p_code AND is_active = true AND (expires_at IS NULL OR expires_at > now());
    
    IF NOT FOUND THEN RETURN NULL; END IF;
    
    RETURN jsonb_build_object(
        'id', v_coupon.id,
        'code', v_coupon.code,
        'discount_type', v_coupon.discount_type,
        'amount_off', v_coupon.amount_off,
        'percent_off', v_coupon.percent_off,
        'min_order_value', v_coupon.min_order_value,
        'restricted_to_product_id', v_coupon.restricted_to_product_id,
        'restricted_to_category_id', v_coupon.restricted_to_category_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT) TO authenticated, anon;

-- System Audit Logger
CREATE OR REPLACE FUNCTION log_audit_event(p_user_id UUID, p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_old_data JSONB, p_new_data JSONB)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_old_data, p_new_data);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB) TO service_role;

--------------------------------------------------------------------------------
-- Performance Indexes
--------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_coupon_id ON public.orders(coupon_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);

CREATE INDEX IF NOT EXISTS idx_products_browse ON public.products(category_id, is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_admin_status ON public.orders(payment_status, fulfillment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_history ON public.orders(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_active_slug ON public.products(slug) WHERE is_archived = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_active_sku ON public.product_variants(sku) WHERE is_archived = false;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_active_code ON public.coupons(code) WHERE is_active = true;

--------------------------------------------------------------------------------
-- Timestamps & Triggers
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.set_current_timestamp_updated_at() FROM PUBLIC;

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_product_images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_webhook_events_updated_at BEFORE UPDATE ON public.webhook_events FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER trigger_anonymize_order_on_delete 
BEFORE UPDATE OF user_id ON public.orders 
FOR EACH ROW 
WHEN (NEW.user_id IS NULL AND OLD.user_id IS NOT NULL) 
EXECUTE FUNCTION public.anonymize_order_on_user_delete();

CREATE TRIGGER trigger_enforce_coupon_limit
BEFORE INSERT ON public.coupon_redemptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_coupon_per_user_limit();

CREATE TRIGGER trigger_protect_order_financials
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_financial_fields();

--------------------------------------------------------------------------------
-- Supabase Storage Configuration (Buckets & Policies)
--------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) 
VALUES ('product_images', 'product_images', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Image Access" ON storage.objects FOR SELECT USING (bucket_id = 'product_images');

CREATE POLICY "Admin Image Upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'product_images' AND public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor'])
);
CREATE POLICY "Admin Image Update" ON storage.objects FOR UPDATE USING (
    bucket_id = 'product_images' AND public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor'])
);
CREATE POLICY "Admin Image Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'product_images' AND public.has_role(ARRAY['super_admin', 'store_manager', 'content_editor'])
);
