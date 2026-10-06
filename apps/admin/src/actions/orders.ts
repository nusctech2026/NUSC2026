'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from './audit'

function getAnonSupabase() {
  return async () => {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
        },
      }
    )
  }
}

function getServiceSupabase() {
  return async () => {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return [] } } }
    )
  }
}

export async function fulfillOrder(orderId: string, trackingNumber: string) {
  const getClient = getAnonSupabase()
  const supabase = await getClient()

  // Note: the RPC fulfill_order handles role-checking internally
  const { error } = await supabase.rpc('fulfill_order', {
    p_order_id: orderId,
    p_tracking_number: trackingNumber
  })

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('fulfill_order', 'orders', orderId, null, { tracking_number: trackingNumber })
  return true
}

export async function refundOrder(orderId: string, amount: number, reason: string) {
  const getAuthClient = getAnonSupabase()
  const authClient = await getAuthClient()

  // Verify identity and roles using the anon client
  const { data: claimsData } = await authClient.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) {
    throw new Error('Unauthorized')
  }

  const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', userId)
  const hasManagerRole = roles?.some(r => ['super_admin', 'store_manager'].includes(r.role))
  if (!hasManagerRole) {
    throw new Error('Insufficient permissions to process refunds')
  }

  // 1. In a real app, call the Payment Provider (e.g. Stripe) here.
  // const stripeRefund = await stripe.refunds.create({ charge: ..., amount: ... })
  // For now, we simulate success and generate an idempotency key.
  const idempotencyKey = `refund_${orderId}_${Date.now()}` // Use provider's refund ID ideally

  const getServiceClient = getServiceSupabase()
  const serviceClient = await getServiceClient()

  // 2. Call transactional RPC to record the refund
  const { data, error } = await serviceClient.rpc('record_refund', {
    p_order_id: orderId,
    p_amount: amount,
    p_reason: reason,
    p_admin_id: userId,
    p_idempotency_key: idempotencyKey
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function cancelOrder(orderId: string, reason: string) {
  const getAuthClient = getAnonSupabase()
  const authClient = await getAuthClient()

  // Verify identity
  const { data: claimsData } = await authClient.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) throw new Error('Unauthorized')

  const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', userId)
  const hasStaffRole = roles?.some(r => ['super_admin', 'store_manager', 'fulfillment_staff'].includes(r.role))
  if (!hasStaffRole) throw new Error('Insufficient permissions')

  const getServiceClient = getServiceSupabase()
  const serviceClient = await getServiceClient()

  const { data, error } = await serviceClient.rpc('cancel_order', {
    p_order_id: orderId,
    p_reason: reason,
    p_admin_id: userId
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function processReturn(orderId: string, itemId: string, quantityToReturn: number, variantId: string) {
  const getAuthClient = getAnonSupabase()
  const authClient = await getAuthClient()

  const { data: claimsData } = await authClient.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) throw new Error('Unauthorized')

  const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', userId)
  const hasStaffRole = roles?.some((r: any) => ['super_admin', 'store_manager', 'fulfillment_staff'].includes(r.role))
  if (!hasStaffRole) throw new Error('Insufficient permissions to process returns')

  const getServiceClient = getServiceSupabase()
  const serviceClient = await getServiceClient()

  const { data, error } = await serviceClient.rpc('process_return', {
    p_order_id: orderId,
    p_item_id: itemId,
    p_quantity: quantityToReturn,
    p_variant_id: variantId,
    p_admin_id: userId
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
