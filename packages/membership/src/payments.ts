import { createAdminClient, createServerClient } from '@nusc/db';
import Razorpay from 'razorpay';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AhibiSeasonPassError, type AhibiSeasonPassId, type AhibiSeasonPassZone } from './ahibi-season-pass';
import { ensureAhibiPassIssued, releaseAhibiPassForOrder, reserveAhibiPassForOrder } from './ahibi-season-pass-flow';

export function assertMembershipCheckoutEnabled() {
  if (process.env.MEMBERSHIP_CHECKOUT_ENABLED === 'false') {
    throw new Error('Membership payments are temporarily paused. Please try again shortly.');
  }
}

const RISE_SMOKE_GATE_ENABLED = 'NUSC_RISE_LIVE_SMOKE_TEST_ENABLED';
const RISE_SMOKE_TESTER_ID = 'NUSC_RISE_LIVE_SMOKE_TEST_USER_ID';
const RISE_SMOKE_EXPIRES_AT = 'NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT';
const RISE_SMOKE_UPGRADE_ENABLED = 'NUSC_RISE_LIVE_SMOKE_UPGRADE_ENABLED';
const RISE_SMOKE_UPGRADE_USER_ID = 'NUSC_RISE_LIVE_SMOKE_UPGRADE_USER_ID';
const RISE_SMOKE_UPGRADE_EXPIRES_AT = 'NUSC_RISE_LIVE_SMOKE_UPGRADE_EXPIRES_AT';
const RISE_SMOKE_GATE_CLOSED = 'Rise tier checkout is temporarily unavailable.';
const RISE_SMOKE_UPGRADE_CLOSED = 'Rise smoke upgrade checkout is unavailable.';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const MAX_SMOKE_TEST_WINDOW_MS = 48 * 60 * 60 * 1000;

function isRiseLiveSmokeTester(userId: string): boolean {
  const enabled = process.env[RISE_SMOKE_GATE_ENABLED];
  if (enabled === undefined || enabled === 'false') return false;
  if (enabled !== 'true') throw new Error(RISE_SMOKE_GATE_CLOSED);

  const testerId = process.env[RISE_SMOKE_TESTER_ID];
  const expiresAt = process.env[RISE_SMOKE_EXPIRES_AT];
  if (!testerId || !UUID_PATTERN.test(testerId) || !expiresAt || !UTC_TIMESTAMP_PATTERN.test(expiresAt)) {
    throw new Error(RISE_SMOKE_GATE_CLOSED);
  }
  const expiry = Date.parse(expiresAt);
  const now = Date.now();
  if (!Number.isFinite(expiry) || expiry <= now || expiry - now > MAX_SMOKE_TEST_WINDOW_MS) {
    throw new Error(RISE_SMOKE_GATE_CLOSED);
  }
  if (!UUID_PATTERN.test(userId) || userId.toLowerCase() !== testerId.toLowerCase()) {
    throw new Error(RISE_SMOKE_GATE_CLOSED);
  }
  return true;
}

function isRiseLiveSmokeUpgradeTester(userId: string): boolean {
  const enabled = process.env[RISE_SMOKE_UPGRADE_ENABLED];
  if (enabled === undefined || enabled === 'false') return false;
  if (enabled !== 'true') throw new Error(RISE_SMOKE_UPGRADE_CLOSED);

  const testerId = process.env[RISE_SMOKE_UPGRADE_USER_ID];
  const expiresAt = process.env[RISE_SMOKE_UPGRADE_EXPIRES_AT];
  if (!testerId || !UUID_PATTERN.test(testerId) || !expiresAt || !UTC_TIMESTAMP_PATTERN.test(expiresAt)) {
    throw new Error(RISE_SMOKE_UPGRADE_CLOSED);
  }
  const expiry = Date.parse(expiresAt);
  const now = Date.now();
  if (!Number.isFinite(expiry) || expiry <= now || expiry - now > MAX_SMOKE_TEST_WINDOW_MS) {
    throw new Error(RISE_SMOKE_UPGRADE_CLOSED);
  }
  return UUID_PATTERN.test(userId) && userId.toLowerCase() === testerId.toLowerCase();
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

export async function createMembershipCheckout(planId: string | null = null, zone: string | null = null): Promise<CheckoutOrder> {
  if (planId !== null && (typeof planId !== 'string' || !/^[a-f0-9-]{36}$/i.test(planId))) throw new Error('Invalid membership plan');
  if (planId === null && zone !== null) throw new Error('Invalid membership plan');
  const session = await createServerClient();
  const { data: { user }, error: authError } = await session.auth.getUser();
  if (authError || !user) throw new Error('Please sign in to continue.');
  assertMembershipCheckoutEnabled();
  const db = createAdminClient();
  let passId: AhibiSeasonPassId | null = null;
  if (planId) {
    const { data: selectedPlan, error: planError } = await db.from('membership_plans')
      .select('slug,is_active,is_purchasable_online').eq('id', planId).maybeSingle();
    if (planError || !selectedPlan || !selectedPlan.is_active || !selectedPlan.is_purchasable_online) {
      throw new Error('Invalid membership plan');
    }
    if (selectedPlan.slug === 'rise-general') {
      passId = 'general-season';
      if (zone !== 'G-1' && zone !== 'G-2' && zone !== 'G-3' && zone !== 'G-4' && zone !== 'G-5') {
        throw new Error('Choose a General season pass seating zone.');
      }
    } else if (selectedPlan.slug === 'rise-premium') {
      passId = 'premium-season';
      if (zone !== null) throw new Error('Premium season passes do not use a seating zone.');
    } else {
      throw new Error('Plan is not available for online payment');
    }
  }
  const isSmokeTest = passId !== null && isRiseLiveSmokeTester(user.id);
  const isSmokeTestUpgrade = passId === 'premium-season' && isRiseLiveSmokeUpgradeTester(user.id);
  const { keyId, client } = paymentGateway();
  const { data: order, error } = await db.rpc(
    isSmokeTestUpgrade ? 'begin_membership_smoke_test_upgrade_payment'
      : isSmokeTest ? 'begin_membership_smoke_test_payment' : 'begin_membership_payment',
    { p_user_id: user.id, p_plan_id: planId },
  );
  if (error) {
    if (isSmokeTestUpgrade) {
      if (error.message.includes('already been used')) throw new Error('Rise smoke upgrade has already been used.');
      if (error.message.includes('existing pending payment')) throw new Error('Complete the existing pending payment first');
      throw new Error(RISE_SMOKE_UPGRADE_CLOSED);
    }
    if (!isSmokeTest) throw new Error(error.message);
    if (error.message.includes('already been used')) throw new Error('Rise live smoke test has already been used.');
    if (error.message.includes('existing pending payment')) throw new Error('Complete the existing pending payment first');
    throw new Error('Rise live smoke test is unavailable.');
  }
  if (!order) throw new Error('Unable to prepare payment.');
  if (isSmokeTestUpgrade && (order.is_smoke_test_upgrade !== true || order.purpose !== 'tier' || Number(order.amount) !== 200)) {
    throw new Error(RISE_SMOKE_UPGRADE_CLOSED);
  }
  if (isSmokeTest && !isSmokeTestUpgrade
      && (order.is_smoke_test !== true || order.purpose !== 'tier' || Number(order.amount) !== 100)) {
    throw new Error('Rise live smoke test is unavailable.');
  }
  if (!order.razorpay_order_id && !order.newly_created) {
    throw new Error('A payment is being prepared. Please try again in a few moments.');
  }
  if (passId) await reserveAhibiPassForOrder(order.id, zone as AhibiSeasonPassZone | null);
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
      if (passId) await releaseAhibiPassForOrder(order.id);
      if (typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 401) {
        console.error('Membership checkout: Razorpay rejected the configured API credentials.');
        throw new Error('Payments are temporarily unavailable. Please try again later.');
      }
      throw new Error('Unable to start payment. Please try again from your dashboard.');
    }
  }
  return { orderId, keyId, amount: Number(order.amount), currency: order.currency,
    description: isSmokeTestUpgrade ? 'NUSC Rise Premium upgrade smoke test'
      : isSmokeTest ? 'NUSC Rise live smoke test'
        : order.purpose === 'registration' ? '₹10 membership registration fee' : 'Annual membership · one year from activation' };
}

export interface PaymentCallback {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function recoverMembershipCheckout(): Promise<{ status: string; ticketStatus?: string }> {
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
  const db = createAdminClient();
  const { data, error: cancelError } = await db.rpc('cancel_membership_payment', { p_user_id: user.id, p_order_id: order.id });
  if (cancelError || !data) throw new Error('Unable to cancel checkout. Please try again.');
  if (data.status === 'cancelled') await releaseAhibiPassForOrder(order.id);
  return data as { status: string };
}

export async function settleCapturedPayment(payment: { id: string; order_id?: string | null; amount: number | string; currency: string; status: string; captured: boolean }): Promise<{ status: string; ticketStatus?: string }> {
  if (payment.status !== 'captured' || payment.captured !== true) return { status: 'pending' };
  if (!payment.order_id || !Number.isSafeInteger(Number(payment.amount)) || Number(payment.amount) <= 0) throw new Error('Invalid captured payment');
  const db = createAdminClient();
  const { data, error } = await db.rpc('settle_membership_payment', { p_order_id: payment.order_id, p_payment_id: payment.id,
    p_amount: Number(payment.amount), p_currency: payment.currency });
  if (error || !data) throw new Error('Unable to confirm payment. Please refresh your dashboard shortly.');
  const result = data as { status: string };
  if (result.status === 'paid' || result.status === 'already_processed') {
    const ticketStatus = await ensureAhibiPassIssued(payment.order_id, payment.id);
    return { ...result, ticketStatus };
  }
  return result;
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
