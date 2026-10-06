import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../store/.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runTests() {
  console.log('--- Starting Transactional Hardening Tests ---')

  try {
    // Setup Admin
    const { data: users } = await supabase.auth.admin.listUsers()
    const adminUser = users.users[0]
    if (!adminUser) throw new Error('No admin user found')
    const adminId = adminUser.id

    // Setup Product & Variant
    const { data: product, error: pErr } = await supabase.from('products').insert({
      name: 'Test Product ' + Date.now(),
      slug: 'test-product-' + Date.now(),
      base_price: 1000
    }).select().single()
    if (pErr) throw new Error('Product insert failed: ' + pErr.message)

    let { data: variant, error: vErr } = await supabase.from('product_variants').insert({
      product_id: product.id,
      sku: 'SKU-' + Date.now(),
      stock_quantity: 10
    }).select().single()
    if (vErr) throw new Error('Variant insert failed: ' + vErr.message)

    console.log('✅ Setup Product & Variant')

    // Test 1: adjust_inventory (insufficient stock)
    const { error: err1 } = await supabase.rpc('adjust_inventory', {
      p_variant_id: variant.id,
      p_delta: -20,
      p_reason: 'Test negative stock',
      p_admin_id: adminId
    })
    if (!err1?.message.includes('Cannot reduce stock below zero')) throw new Error('Failed to prevent negative stock')
    console.log('✅ Prevented negative stock adjustment')

    // Test 2: adjust_inventory (successful)
    await supabase.rpc('adjust_inventory', {
      p_variant_id: variant.id,
      p_delta: -2,
      p_reason: 'Test normal reduction',
      p_admin_id: adminId
    })
    const { data: updatedVar } = await supabase.from('product_variants').select('stock_quantity').eq('id', variant.id).single()
    if (updatedVar.stock_quantity !== 8) throw new Error('Stock not updated correctly')
    console.log('✅ Successful inventory adjustment')

    // Setup Order
    const { data: order, error: oErr } = await supabase.from('orders').insert({
      user_id: adminId, // simulate user
      user_email_snapshot: 'test@example.com',
      subtotal: 1000,
      tax_amount: 0,
      shipping_amount: 0,
      discount_amount: 0,
      total_amount: 1000,
      payment_status: 'paid',
      fulfillment_status: 'unfulfilled'
    }).select().single()
    if (oErr) throw new Error('Order insert failed: ' + oErr.message)

    const { data: orderItem, error: oiErr } = await supabase.from('order_items').insert({
      order_id: order.id,
      variant_id: variant.id,
      product_name_snapshot: product.name,
      variant_sku_snapshot: variant.sku,
      quantity: 2,
      price_at_purchase: 500
    }).select().single()
    if (oiErr) throw new Error('OrderItem insert failed: ' + oiErr.message)

    console.log('✅ Setup Order')

    // Test 3: cancel_order (fails if paid without being refunded? Or fails if we try to cancel directly without explicit logic?)
    // Ah, my logic in cancel_order says "Cannot cancel a paid order directly. Issue a refund first or simultaneously."
    const { error: cancelErr } = await supabase.rpc('cancel_order', {
      p_order_id: order.id, p_reason: 'Test', p_admin_id: adminId
    })
    if (!cancelErr?.message.includes('Cannot cancel a paid order directly')) throw new Error('Failed to prevent cancellation of paid order')
    console.log('✅ Prevented direct cancellation of paid order')

    // Test 4: record_refund (Partial)
    const idempotencyKey1 = 'ref_' + Date.now()
    const { error: rrErr } = await supabase.rpc('record_refund', {
      p_order_id: order.id, p_amount: 500, p_reason: 'Partial', p_admin_id: adminId, p_idempotency_key: idempotencyKey1
    })
    if (rrErr) throw new Error('Record refund RPC failed: ' + rrErr.message)
    const { data: o2 } = await supabase.from('orders').select('payment_status, total_refunded').eq('id', order.id).single()
    if (o2.payment_status !== 'paid' || Number(o2.total_refunded) !== 500) throw new Error(`Partial refund failed. payment_status=${o2.payment_status} total_refunded=${o2.total_refunded}`)
    console.log('✅ Partial refund successful')

    // Test 5: record_refund (Idempotency)
    await supabase.rpc('record_refund', {
      p_order_id: order.id, p_amount: 500, p_reason: 'Partial', p_admin_id: adminId, p_idempotency_key: idempotencyKey1
    })
    const { data: o3 } = await supabase.from('orders').select('payment_status, total_refunded').eq('id', order.id).single()
    if (o3.total_refunded !== 500) throw new Error('Idempotency failed')
    console.log('✅ Idempotency protection worked')

    // Test 6: process_return (Partial return)
    await supabase.rpc('process_return', {
      p_order_id: order.id, p_item_id: orderItem.id, p_quantity: 1, p_variant_id: variant.id, p_admin_id: adminId
    })
    const { data: oI2 } = await supabase.from('order_items').select('quantity_returned').eq('id', orderItem.id).single()
    if (oI2.quantity_returned !== 1) throw new Error('Partial return failed')
    const { data: v3 } = await supabase.from('product_variants').select('stock_quantity').eq('id', variant.id).single()
    if (v3.stock_quantity !== 9) throw new Error('Inventory not restored on return')
    console.log('✅ Partial return and inventory restoration successful')

    // Test 7: process_return (Full return triggers order status change)
    await supabase.rpc('process_return', {
      p_order_id: order.id, p_item_id: orderItem.id, p_quantity: 1, p_variant_id: variant.id, p_admin_id: adminId
    })
    const { data: o4 } = await supabase.from('orders').select('fulfillment_status').eq('id', order.id).single()
    if (o4.fulfillment_status !== 'returned') throw new Error('Order not marked returned')
    console.log('✅ Full return status update successful')

    console.log('--- ALL TESTS PASSED ---')
    process.exit(0)
  } catch (err) {
    console.error('❌ TEST FAILED:', err)
    process.exit(1)
  }
}

runTests()
