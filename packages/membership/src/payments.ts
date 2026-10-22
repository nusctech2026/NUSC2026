import { createAdminClient, createServerClient } from '@nusc/db';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function assertMembershipCheckoutEnabled() {
  if (process.env.MEMBERSHIP_CHECKOUT_ENABLED === 'false') {
    throw new Error('Membership payments are temporarily paused. Please try again shortly.');
  }
}

export function paymentGateway() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw new Error('Payments are temporarily unavailable. Please try again later.');
  return { keyId, secret, client: new Razorpay({ key_id: keyId, key_secret: secret }) };
}

export function validPaymentSignature(message: string, signature: unknown, secret: string) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

export interface CheckoutOrder {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  description: string;
}

export async function createMembershipCheckout(planId: string | null = null): Promise<CheckoutOrder> {
  if (planId !== null && (typeof planId !== 'string' || !/^[a-f0-9-]{36}$/i.test(planId))) throw new Error('Invalid membership plan');
  const session = await createServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) throw new Error('Please sign in to continue.');
  assertMembershipCheckoutEnabled();
  const { keyId, client } = paymentGateway();
  const db = createAdminClient();
  const { data: order, error } = await db.rpc('begin_membership_payment', { p_user_id: user.id, p_plan_id: planId });
  if (error) throw new Error(error.message);
  if (!order) throw new Error('Unable to prepare payment.');
  let orderId: string = order.razorpay_order_id;
  if (!orderId) {
    if (!order.newly_created) throw new Error('A payment is being prepared. Please try again in a few moments.');
    try {
      const external = await client.orders.create({ amount: Number(order.amount), currency: 'INR', receipt: order.id,
        notes: { membership_payment_id: order.id } });
      if (Number(external.amount) !== Number(order.amount) || external.currency !== 'INR') throw new Error('Gateway order mismatch');
      const { data: bound, error: bindError } = await db.from('membership_payment_orders')
        .update({ razorpay_order_id: external.id, status: 'pending' }).eq('id', order.id).eq('status', 'creating')
        .select('id').single();
      if (bindError || !bound) throw new Error('Unable to save the payment order');
      orderId = external.id;
    } catch (error) {
      await db.from('membership_payment_orders').update({ status: 'creation_failed' }).eq('id', order.id).eq('status', 'creating');
      if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 401) {
        console.error('Membership checkout: Razorpay rejected the configured API credentials.');
        throw new Error('Payments are temporarily unavailable. Please try again later.');
      }
      throw new Error('Unable to start payment. Please try again from your dashboard.');
    }
  }
  return { orderId, keyId, amount: Number(order.amount), currency: order.currency,
    description: order.purpose === 'registration' ? '₹10 membership registration fee' : 'Annual membership · one year from activation' };
}

export interface PaymentCallback {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function recoverMembershipCheckout() {
  const session = await createServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) throw new Error('Please sign in to continue.');
  // Recovery takes no client identity or order ID and never creates a new charge.
  const { data: order, error } = await session.from('membership_payment_orders').select('razorpay_order_id')
    .eq('user_id', user.id).in('status', ['creating', 'pending']).maybeSingle();
  if (error) throw new Error('Unable to check your payment. Please try again shortly.');
  if (!order) return { status: 'not_found' };
  if (!order.razorpay_order_id) return { status: 'pending' };
  const { client } = paymentGateway();
  const payments = await client.orders.fetchPayments(order.razorpay_order_id);
  const captured = payments.items.find(payment => payment.status === 'captured' && payment.captured === true);
  if (!captured) return { status: 'pending' };
  if (captured.order_id !== order.razorpay_order_id) throw new Error('Payment order mismatch.');
  return settleCapturedPayment(captured);
}

export async function cancelMembershipCheckout() {
  const session = await createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error('Please sign in to continue.');
  const { data: order, error } = await session.from('membership_payment_orders').select('id,razorpay_order_id')
    .eq('user_id', user.id).eq('purpose', 'tier').in('status', ['creating','pending']).maybeSingle();
  if (error) throw new Error('Unable to find your pending checkout.');
  if (!order) return { status: 'cancelled' };
  if (order.razorpay_order_id) {
    const { client } = paymentGateway();
    const payments = await client.orders.fetchPayments(order.razorpay_order_id);
    const captured = payments.items.find(payment => payment.status === 'captured' && payment.captured);
    if (captured) return settleCapturedPayment(captured);
    if (payments.items.some(payment => payment.status === 'authorized')) {
      throw new Error('Payment is processing. Please wait for confirmation before changing tiers.');
    }
  }
  const { data, error: cancelError } = await createAdminClient().rpc('cancel_membership_payment', { p_user_id: user.id, p_order_id: order.id });
  if (cancelError || !data) throw new Error('Unable to cancel checkout. Please try again.');
  return data as { status: string };
}

export async function settleCapturedPayment(payment: { id: string; order_id?: string | null; amount: number | string; currency: string; status: string; captured: boolean }) {
  if (payment.status !== 'captured' || payment.captured !== true) return { status: 'pending' };
  if (!payment.order_id || !Number.isSafeInteger(Number(payment.amount)) || Number(payment.amount) <= 0) throw new Error('Invalid captured payment');
  const db = createAdminClient();
  const { data, error } = await db.rpc('settle_membership_payment', { p_order_id: payment.order_id, p_payment_id: payment.id,
    p_amount: Number(payment.amount), p_currency: payment.currency });
  if (error || !data) throw new Error('Unable to confirm payment. Please refresh your dashboard shortly.');
  return data as { status: string };
}

export async function confirmMembershipCheckout(callback: PaymentCallback) {
  if (!callback || typeof callback.razorpay_order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(callback.razorpay_order_id)
    || typeof callback.razorpay_payment_id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(callback.razorpay_payment_id)) throw new Error('Invalid payment response');
  const session = await createServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) throw new Error('Please sign in to confirm payment.');
  // RLS and explicit user check bind the callback to the signed-in member's stored order.
  const { data: order, error } = await session.from('membership_payment_orders').select('razorpay_order_id')
    .eq('razorpay_order_id', callback.razorpay_order_id).eq('user_id', user.id).single();
  if (error || !order) throw new Error('Payment order not found for your account.');
  const { client, secret } = paymentGateway();
  if (!validPaymentSignature(`${order.razorpay_order_id}|${callback.razorpay_payment_id}`, callback.razorpay_signature, secret)) throw new Error('Payment verification failed.');
  // A valid Checkout signature alone does not establish capture or amount.
  const payment = await client.payments.fetch(callback.razorpay_payment_id);
  if (payment.order_id !== order.razorpay_order_id) throw new Error('Payment order mismatch.');
  return settleCapturedPayment(payment);
}
