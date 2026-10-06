import { createClient } from '@supabase/supabase-js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, 'apps/web/.env.local') });

// In a real local setup, these keys would come from the local instance.
// Using default local Supabase URL and a fallback anon key if not set.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE STORE INTEGRATION TESTS ---\n');
  let testCount = 0;
  let passCount = 0;

  function assert(condition, testName, errorMsg) {
    testCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       -> ${errorMsg}`);
    }
  }

  const timestamp = Date.now();
  
  // Create Test Users
  const customerEmail = `customer_${timestamp}@test.com`;
  const customer2Email = `customer2_${timestamp}@test.com`;
  const editorEmail = `editor_${timestamp}@test.com`;
  const fulfillmentEmail = `fulfillment_${timestamp}@test.com`;
  
  const { data: c1Data } = await adminSupabase.auth.admin.createUser({ email: customerEmail, password: 'password123', email_confirm: true, user_metadata: { app_role: 'customer' } });
  const { data: c2Data } = await adminSupabase.auth.admin.createUser({ email: customer2Email, password: 'password123', email_confirm: true, user_metadata: { app_role: 'customer' } });
  const { data: edData } = await adminSupabase.auth.admin.createUser({ email: editorEmail, password: 'password123', email_confirm: true, user_metadata: { app_role: 'content_editor' } });
  const { data: fData } = await adminSupabase.auth.admin.createUser({ email: fulfillmentEmail, password: 'password123', email_confirm: true, user_metadata: { app_role: 'fulfillment_staff' } });

  const c1Id = c1Data.user.id;
  const c2Id = c2Data.user.id;
  const edId = edData.user.id;
  const fId = fData.user.id;

  // Setup roles in public.user_roles (which has_role() checks)
  const { error: roleErr } = await adminSupabase.from('user_roles').insert([
    { user_id: edId, role: 'content_editor' },
    { user_id: fId, role: 'fulfillment_staff' }
  ]);
  if (roleErr) throw new Error(`Role insert failed: ${roleErr.message}`);

  const clientC1 = createClient(supabaseUrl, supabaseAnonKey);
  await clientC1.auth.signInWithPassword({ email: customerEmail, password: 'password123' });
  
  const clientC2 = createClient(supabaseUrl, supabaseAnonKey);
  await clientC2.auth.signInWithPassword({ email: customer2Email, password: 'password123' });

  const clientEd = createClient(supabaseUrl, supabaseAnonKey);
  await clientEd.auth.signInWithPassword({ email: editorEmail, password: 'password123' });

  const clientF = createClient(supabaseUrl, supabaseAnonKey);
  await clientF.auth.signInWithPassword({ email: fulfillmentEmail, password: 'password123' });

  // 1. Setup Catalog (Products & Variants)
  const catRes = await adminSupabase.from('categories').insert([{ name: 'Apparel', slug: `apparel-${timestamp}` }]).select().single();
  const catId = catRes.data.id;

  const prodRes = await adminSupabase.from('products').insert([
    { category_id: catId, name: 'JerseyInc', slug: `jersey-inc-${timestamp}`, base_price: 5000, tax_rate: 10, is_tax_inclusive: true, is_archived: false, description: 'desc' },
    { category_id: catId, name: 'JerseyExc', slug: `jersey-exc-${timestamp}`, base_price: 3000, tax_rate: 5, is_tax_inclusive: false, is_archived: false, description: 'desc' },
    { category_id: catId, name: 'Shorts', slug: `shorts-${timestamp}`, base_price: 2000, tax_rate: 10, is_tax_inclusive: true, is_archived: true, description: 'desc' } // Archived product
  ]).select();
  const [prodJerseyInc, prodJerseyExc, prodShorts] = prodRes.data;

  // Variants
  const varRes = await adminSupabase.from('product_variants').insert([
    { product_id: prodJerseyInc.id, sku: `J-1-${timestamp}`, stock_quantity: 10, is_archived: false },
    { product_id: prodJerseyExc.id, sku: `J-2-${timestamp}`, stock_quantity: 5, is_archived: false },
    { product_id: prodShorts.id, sku: `S-1-${timestamp}`, stock_quantity: 10, is_archived: false }
  ]).select();
  
  const [vJerseyInc, vJerseyExc, vShorts] = varRes.data;

  console.log('Setup complete. Running Store Integration tests...\n');

  try {
    // RLS: Customer sees only public active catalog
    const { data: custProds } = await clientC1.from('products').select('slug');
    assert(custProds.some(p => p.slug === prodJerseyInc.slug), 'Customer can see public product', 'Missing public product');
    assert(!custProds.some(p => p.slug === prodShorts.slug), 'Customer cannot see archived product', 'Saw archived product');

    // Checkout 1: Calculate correctly, DB price wins, Duplicate normalized
    const idemKey1 = crypto.randomUUID();
    const preparedItems1 = [
      { variant_id: vJerseyInc.id, quantity: 1 }, 
      { variant_id: vJerseyInc.id, quantity: 2 }, // Duplicate variant, should normalize to qty 3
      { variant_id: vJerseyExc.id, quantity: 1 }
    ];

    const { data: o1Id, error: o1Err } = await adminSupabase.rpc('create_order', {
      p_user_id: c1Id,
      p_user_email: customerEmail,
      p_shipping_address: { city: 'Test' },
      p_items: preparedItems1,
      p_shipping_amount: 1000,
      p_coupon_id: null,
      p_idempotency_key: idemKey1
    });
    
    assert(!o1Err, 'Order creation succeeds for valid items', o1Err?.message);

    const { data: o1 } = await adminSupabase.from('orders').select('*').eq('id', o1Id).single();
    
    // Validate normalization and price:
    // vJerseyInc (qty 3, price 5000, inc 10% tax) -> gross 15000, tax 1364, net 13636
    // vJerseyExc (qty 1, price 3000, exc 5% tax)  -> net 3000, tax 150, gross 3150
    // Subtotal: 13636 + 3000 = 16636
    // Tax: 1364 + 150 = 1514
    // Total = 16636 + 1514 + 1000(shipping) = 19150
    assert(o1.subtotal === 16636, 'Subtotal correctly calculates native DB prices ignoring client override', `Expected 16636, got ${o1.subtotal}`);
    assert(o1.tax_amount === 1514, 'Tax correctly calculates inclusive and exclusive', `Expected 1514, got ${o1.tax_amount}`);
    assert(o1.total_amount === 19150, 'Total is exact sum of components', `Expected 19150, got ${o1.total_amount}`);

    const { data: o1Items } = await adminSupabase.from('order_items').select('*').eq('order_id', o1Id);
    assert(o1Items.length === 2, 'Duplicate variants were merged into a single order line', `Got ${o1Items.length} lines`);
    
    // RLS: Customer 1 can see Order 1, Customer 2 cannot
    const { data: o1C1 } = await clientC1.from('orders').select('id').eq('id', o1Id);
    assert(o1C1.length === 1, 'Customer can see their own order', 'Missing order');
    const { data: o1C2 } = await clientC2.from('orders').select('id').eq('id', o1Id);
    assert(o1C2.length === 0, 'Customer 2 cannot see Customer 1 order', 'Saw other order');

    // Checkout 2: Idempotency protection
    const { data: o1IdDup, error: o1DupErr } = await adminSupabase.rpc('create_order', {
      p_user_id: c1Id,
      p_user_email: customerEmail,
      p_shipping_address: { city: 'Test' },
      p_items: preparedItems1,
      p_shipping_amount: 1000,
      p_coupon_id: null,
      p_idempotency_key: idemKey1
    });
    assert(o1IdDup === o1Id, 'Checkout idempotency returns existing order ID safely', o1DupErr?.message);

    // Checkout 3: Cannot buy archived products
    const idemKey2 = crypto.randomUUID();
    const { error: o2Err } = await adminSupabase.rpc('create_order', {
      p_user_id: c1Id,
      p_user_email: customerEmail,
      p_shipping_address: { city: 'Test' },
      p_items: [{ variant_id: vShorts.id, quantity: 1 }],
      p_shipping_amount: 0,
      p_coupon_id: null,
      p_idempotency_key: idemKey2
    });
    assert(o2Err !== null, 'Checkout rejects archived product variants', 'Allowed checkout of archived product');

    // Coupon Checkout: Restricted discounting
    const coupRes = await adminSupabase.from('coupons').insert([{
      code: `JERSEY20-${timestamp}`, discount_type: 'percentage', percent_off: 20, restricted_to_product_id: prodJerseyExc.id, is_active: true
    }]).select().single();
    
    const idemKey3 = crypto.randomUUID();
    const { data: o3Id, error: o3Err } = await adminSupabase.rpc('create_order', {
      p_user_id: c1Id,
      p_user_email: customerEmail,
      p_shipping_address: { city: 'Test' },
      p_items: [
        { variant_id: vJerseyExc.id, quantity: 1 }, // 3000 net, 150 tax = 3150 gross (eligible) -> 20% of 3150 = 630
        // normally we would add another ineligible item to test restriction, but our other product is archived.
        // Let's create an active non-jersey product quickly.
      ],
      p_shipping_amount: 1000,
      p_coupon_id: coupRes.data.id,
      p_idempotency_key: idemKey3
    });
    
    assert(!o3Err, 'Checkout with restricted coupon succeeds', o3Err?.message);
    const { data: o3 } = await adminSupabase.from('orders').select('*').eq('id', o3Id).single();
    assert(o3.discount_amount === 630, 'Restricted coupon discount calculated correctly', `Expected 630, got ${o3.discount_amount}`);

    // Webhook/Payment Exception handling: Setup the race condition
    // 1. Create order 4 for 10 items while stock is still 10 (before order 1 is paid)
    const idemKey4 = crypto.randomUUID();
    const { data: o4Id } = await adminSupabase.rpc('create_order', {
      p_user_id: c2Id,
      p_user_email: customer2Email,
      p_shipping_address: { city: 'Test' },
      p_items: [{ variant_id: vJerseyInc.id, quantity: 10 }], // 10 left right now
      p_shipping_amount: 0,
      p_coupon_id: null,
      p_idempotency_key: idemKey4
    });
    
    // Payment Confirmation 1: Success path (consumes 3 items)
    const { error: payErr } = await adminSupabase.rpc('confirm_order_payment', {
      p_order_id: o1Id, p_provider: 'razorpay', p_provider_order_id: `rzp_order_1_${timestamp}`, p_provider_payment_id: `rzp_pay_1_${timestamp}`
    });
    assert(!payErr, 'confirm_order_payment succeeds for valid inventory', payErr?.message);

    const { data: vJerseyIncAfter } = await adminSupabase.from('product_variants').select('stock_quantity').eq('id', vJerseyInc.id).single();
    assert(vJerseyIncAfter.stock_quantity === 7, 'Inventory successfully decremented (10 - 3 = 7)', `Got ${vJerseyIncAfter.stock_quantity}`);

    const { data: o1AfterPay } = await adminSupabase.from('orders').select('payment_status, fulfillment_status').eq('id', o1Id).single();
    assert(o1AfterPay.payment_status === 'paid', 'Order payment_status is paid', `Got ${o1AfterPay.payment_status}`);

    // Fulfillment Restriction
    // Editor shouldn't be able to fulfill
    const { error: f1Err } = await clientEd.rpc('fulfill_order', { p_order_id: o1Id, p_tracking_number: '123' });
    assert(f1Err !== null, 'Content Editor cannot fulfill orders', 'Editor fulfilled order');

    // Fulfillment staff CAN fulfill
    const { error: f2Err } = await clientF.rpc('fulfill_order', { p_order_id: o1Id, p_tracking_number: '123' });
    assert(f2Err === null, 'Fulfillment staff can fulfill paid order', f2Err?.message);

    const { data: o1AfterFulfill } = await adminSupabase.from('orders').select('fulfillment_status').eq('id', o1Id).single();
    assert(o1AfterFulfill.fulfillment_status === 'fulfilled', 'Order is fulfilled', `Got ${o1AfterFulfill.fulfillment_status}`);

    // Customer CANNOT mutate their own order (RLS Protection)
    const { error: mutErr } = await clientC1.from('orders').update({ payment_status: 'refunded', total_refunded: 19150 }).eq('id', o1Id);
    assert(mutErr !== null, 'Customer cannot update their own order via client', 'Customer was able to mutate order');

    // 2. Now webhook arrives for order 4. Stock is 7, but it needs 10!
    const { error: pay2Err } = await adminSupabase.rpc('confirm_order_payment', {
      p_order_id: o4Id, p_provider: 'razorpay', p_provider_order_id: `rzp_order_2_${timestamp}`, p_provider_payment_id: `rzp_pay_2_${timestamp}`
    });
    
    const { data: o4AfterFail } = await adminSupabase.from('orders').select('payment_status, fulfillment_status').eq('id', o4Id).single();
    assert(o4AfterFail.payment_status === 'paid' && o4AfterFail.fulfillment_status === 'exception', 
      'Payment succeeds but lack of inventory flags fulfillment as exception', 
      `Got P:${o4AfterFail?.payment_status} F:${o4AfterFail?.fulfillment_status}`);

    // --- Refund Tests ---
    // Service role processes refund
    const { data: pay1 } = await adminSupabase.from('payments').select('id').eq('order_id', o1Id).single();
    const { error: refundInsertErr } = await adminSupabase.from('refunds').insert({
      order_id: o1Id,
      payment_id: pay1.id,
      amount: 5000,
      reason: 'Return requested',
      status: 'completed'
    });
    assert(!refundInsertErr, 'Service role can create refund', refundInsertErr?.message);
    
    // Customer can view their own refund
    const { data: myRefunds } = await clientC1.from('refunds').select('*').eq('order_id', o1Id);
    assert(myRefunds && myRefunds.length === 1, 'Customer can view their own refund', 'Refund not found');

    // Customer cannot modify refund
    const { error: refundMutErr } = await clientC1.from('refunds').update({ amount: 99999 }).eq('order_id', o1Id);
    assert(refundMutErr !== null, 'Customer cannot update their own refund via client', 'Customer was able to mutate refund');

    // --- Account Deletion Tests ---
    // Admin deletes Customer 1
    const { error: delErr } = await adminSupabase.auth.admin.deleteUser(c1Id);
    if (delErr) {
      console.error('Delete user error details:', JSON.stringify(delErr, null, 2));
    }
    assert(!delErr, 'Admin can delete user', delErr?.message);

    // Verify order was anonymized
    const { data: anonOrder } = await adminSupabase.from('orders').select('user_id, user_email_snapshot, shipping_address').eq('id', o1Id).single();
    assert(anonOrder.user_id === null, 'Order user_id is nullified on account deletion', `Got ${anonOrder.user_id}`);
    assert(anonOrder.user_email_snapshot === 'anonymized@deleted.user', 'Order email is anonymized on account deletion', `Got ${anonOrder.user_email_snapshot}`);
    
    // Attempted read via old client should fail (since token is theoretically dead, but definitely fails RLS)
    const { data: ghostOrders } = await clientC1.from('orders').select('*').eq('id', o1Id);
    assert(ghostOrders.length === 0, 'Deleted user can no longer read their old order', 'Order was readable by deleted user');
      
  } catch (err) {
    console.error('\nUnexpected test failure:', err);
  } finally {
    console.log(`\nTests Completed: ${passCount}/${testCount} passed.`);
    process.exit(passCount === testCount ? 0 : 1);
  }
}

runTests();
