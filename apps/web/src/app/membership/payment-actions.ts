'use server';

import { createMembershipCheckout, confirmMembershipCheckout, cancelMembershipCheckout, recoverMembershipCheckout, type PaymentCallback } from '@nusc/membership/src/payments';
import { AhibiSeasonPassError } from '@nusc/membership/src/ahibi-season-pass';
import { revalidatePath } from 'next/cache';

const safeMessages = new Set([
  'Please sign in to continue.', 'Please sign in to confirm payment.', 'Invalid membership plan',
  'Membership is cancelled', 'Registration is already paid', 'Registration payment is required',
  'Plan is not available for online payment', 'Choose a higher membership tier',
  'Complete the existing pending payment first', 'Membership pricing is not configured correctly',
  'A payment is being prepared. Please try again in a few moments.',
  'Payments are temporarily unavailable. Please try again later.',
  'Unable to start payment. Please try again from your dashboard.',
  'Payment verification failed.', 'Payment order not found for your account.',
  'Payment is processing. Please wait for confirmation before changing tiers.',
  'Unable to cancel checkout. Please try again.',
  'Unable to check your payment. Please try again shortly.',
  'Membership payments are temporarily paused. Please try again shortly.',
  'Rise tier checkout is temporarily unavailable.',
  'Rise live smoke test is unavailable.',
  'Rise live smoke test has already been used.',
  'Rise smoke upgrade checkout is unavailable.',
  'Rise smoke upgrade has already been used.',
]);
function paymentError(error: unknown, fallback = 'Unable to confirm payment. Please refresh your dashboard shortly or try again.') {
  const message = error instanceof Error ? error.message : '';
  if (error instanceof AhibiSeasonPassError && error.code === 'AHIBI_NO_REMAINING_MATCHES') {
    return 'There are no unplayed home matches left in your General pass to upgrade.';
  }
  if (message === 'AHIBI_SOLD_OUT' || message === 'AHIBI_HTTP_409'
    || (error instanceof AhibiSeasonPassError && error.status === 409)) {
    return 'Ahibi could not reserve all ten tickets for this pass and zone. No membership payment was started; choose another zone or try again later.';
  }
  if (message.startsWith('AHIBI_')) {
    return 'Ahibi ticketing is temporarily unavailable. No membership payment was started; please try again shortly.';
  }
  return safeMessages.has(message) ? message : fallback;
}

export async function checkMembershipPayment() {
  try {
    const result = await recoverMembershipCheckout();
    revalidatePath('/dashboard');
    return { success: true as const, status: result.status, ticketStatus: result.ticketStatus };
  } catch (error) { return { success: false as const, error: paymentError(error) }; }
}

export async function cancelPendingMembershipPayment() {
  try {
    const result = await cancelMembershipCheckout();
    revalidatePath('/dashboard');
    return { success: true as const, status: result.status };
  } catch (error) { return { success: false as const, error: paymentError(error) }; }
}

export async function startMembershipPayment(planId: string | null = null, zone: string | null = null) {
  try { return { success: true as const, order: await createMembershipCheckout(planId, zone) }; }
  catch (error) { return { success: false as const, error: paymentError(error, 'Unable to start payment. Please try again from your dashboard.') }; }
}

export async function verifyMembershipPayment(callback: PaymentCallback) {
  try {
    const result = await confirmMembershipCheckout(callback);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/tickets');
    return { success: true as const, status: result.status, ticketStatus: result.ticketStatus };
  } catch (error) { return { success: false as const, error: paymentError(error) }; }
}
