'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ensureAhibiPassIssued, recoverMissingAhibiPremiumTickets } from '@nusc/membership'
import { assertStaffRole } from '../../../../utils/supabaseServerClient'
import { getMembershipFulfillmentRetryOrder } from '../../../../utils/membershipFulfillmentDb'

const route = '/admin/membership-fulfillment'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function retryMembershipTicketIssuanceAction(formData: FormData) {
  await assertStaffRole(['store_manager', 'membership_manager'])

  const orderId = String(formData.get('orderId') || '').trim()
  if (!uuid.test(orderId)) redirect(`${route}?action=invalid`)

  let order: Awaited<ReturnType<typeof getMembershipFulfillmentRetryOrder>>
  try {
    order = await getMembershipFulfillmentRetryOrder(orderId)
  } catch {
    console.error('Membership ticket retry order lookup failed.')
    redirect(`${route}?action=unavailable`)
  }

  if (!order || order.purpose !== 'tier' || !['rise-general', 'rise-premium'].includes(order.planSlug)
      || order.paymentStatus !== 'paid' || !order.razorpayOrderId || !order.paymentId
      || !order.reservationId
      || (order.planSlug === 'rise-general' && order.passId !== 'general-season')
      || (order.planSlug === 'rise-premium' && order.passId !== 'premium-season')) {
    redirect(`${route}?action=not-eligible`)
  }
  if (order.issuanceStatus === 'issued') redirect(`${route}?action=already-issued`)
  if (order.issuanceStatus === 'refund_required') redirect(`${route}?action=refund_required`)

  let result = 'pending'
  try {
    result = await ensureAhibiPassIssued(order.razorpayOrderId, order.paymentId)
  } catch (error) {
    console.error('Membership ticket retry failed:', error instanceof Error ? error.name : 'unknown_error')
    result = 'pending'
  }

  revalidatePath(route)
  revalidatePath('/admin/collections/members')
  redirect(`${route}?action=${encodeURIComponent(result)}`)
}

export async function recoverMissingPremiumTicketsAction(formData: FormData) {
  await assertStaffRole(['store_manager', 'membership_manager'])

  const orderId = String(formData.get('orderId') || '').trim()
  if (!uuid.test(orderId)) redirect(`${route}?action=invalid`)

  let result = 'recovery-pending'
  try {
    await recoverMissingAhibiPremiumTickets(orderId)
    result = 'recovered'
  } catch (error) {
    const code = error instanceof Error && 'code' in error && typeof error.code === 'string'
      ? error.code : 'partner_error'
    const status = error instanceof Error && 'status' in error ? error.status : undefined
    console.error('Membership ticket recovery failed:', /^[A-Z0-9_]{1,80}$/.test(code) ? code : 'partner_error')
    result = status === 409 ? 'recovery-conflict' : 'recovery-pending'
  }

  revalidatePath(route)
  revalidatePath('/admin/collections/members')
  redirect(`${route}?action=${result}`)
}
