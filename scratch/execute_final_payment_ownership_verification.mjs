import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'staging_rzp_webhook_secret_nusc_2026';
const rzpKeyId = process.env.RAZORPAY_KEY_ID;
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookUrl = 'http://localhost:3000/api/webhooks/razorpay';

const adminClient = createClient(supabaseUrl, supabaseKey);
const rzp = new Razorpay({ key_id: rzpKeyId, key_secret: rzpKeySecret });

function signPayload(body, secret = webhookSecret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function runVerification() {
  console.log('========================================================================');
  console.log('  NUSC PHASE 0.5 FINAL REAL PAYMENT & ORDER-TO-MEMBER VERIFICATION     ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] #${total}: ${name} ${details ? `(${details})` : ''}`);
    } else {
      console.error(`  [FAIL] #${total}: ${name} - ${details}`);
      process.exit(1);
    }
  }

  const orderId = 'order_TmvOc35sXfYcyV';
  const paymentId = 'pay_TmvOgsL9ptdqOV';
  const userId = 'ec2ce176-5966-468a-aec3-01a291ca81ae';

  // ---------------------------------------------------------------------------
  // 1. Authoritative Razorpay API Verification
  // ---------------------------------------------------------------------------
  console.log('--- 1. Query Live Authoritative Razorpay Server Records ---');
  const rzpPayment = await rzp.payments.fetch(paymentId);
  assert(rzpPayment.id === paymentId, 'Razorpay payment fetched via API', rzpPayment.id);
  assert(rzpPayment.status === 'captured', 'Authoritative payment status is captured', rzpPayment.status);
  assert(rzpPayment.amount === 1000, 'Authoritative payment amount is exactly 1000 paise (₹10.00)', `${rzpPayment.amount} paise`);
  assert(rzpPayment.currency === 'INR', 'Authoritative currency is INR', rzpPayment.currency);
  assert(rzpPayment.order_id === orderId, 'Payment references expected Razorpay order ID', rzpPayment.order_id);
  assert(rzpPayment.method === 'netbanking', 'Payment method is genuine Netbanking Test Mode', rzpPayment.method);

  const rzpOrder = await rzp.orders.fetch(orderId);
  assert(rzpOrder.id === orderId, 'Razorpay order fetched via API', rzpOrder.id);
  assert(rzpOrder.status === 'paid', 'Authoritative Razorpay order status is paid', rzpOrder.status);
  assert(rzpOrder.amount_paid === 1000, 'Authoritative order amount_paid is 1000 paise', `${rzpOrder.amount_paid} paise`);
  assert(rzpOrder.amount_due === 0, 'Authoritative order amount_due is 0', `${rzpOrder.amount_due} paise`);
  assert(rzpOrder.notes.userId === userId, 'Razorpay order notes contain authenticated member userId', rzpOrder.notes.userId);

  // ---------------------------------------------------------------------------
  // 2. Database Pre-Webhook Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Database Pre-Webhook Member State & Order Binding ---');
  const { data: memberBefore } = await adminClient
    .from('members')
    .select('id, user_id, status, registration_payment_status, registration_payment_id, registration_order_id, membership_number')
    .eq('registration_order_id', orderId)
    .single();

  assert(Boolean(memberBefore), 'Found registered member by registration_order_id', memberBefore.membership_number);
  assert(memberBefore.user_id === userId, 'Database member user_id matches Razorpay order notes', memberBefore.user_id);
  assert(memberBefore.registration_order_id === orderId, 'registration_order_id matches authoritative Razorpay order ID', memberBefore.registration_order_id);
  assert(memberBefore.status === 'pending_payment', 'Pre-webhook status is pending_payment', memberBefore.status);
  assert(memberBefore.registration_payment_status === 'pending', 'Pre-webhook registration_payment_status is pending');
  assert(memberBefore.registration_payment_id === null, 'Pre-webhook registration_payment_id is null');

  // ---------------------------------------------------------------------------
  // 3. Staging Webhook Processing of Genuine Payment
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Process Genuine Captured Payment Through Staging Webhook ---');
  const realWebhookPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: rzpPayment.id,
          order_id: rzpPayment.order_id,
          amount: rzpPayment.amount,
          currency: rzpPayment.currency,
          status: 'captured',
          notes: {
            userId: userId,
            type: 'registration_fee'
          }
        }
      }
    }
  });

  const webhookSignature = signPayload(realWebhookPayload);
  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSignature,
    },
    body: realWebhookPayload
  });

  const webhookJson = await webhookRes.json();
  assert(webhookRes.status === 200, 'Webhook accepted valid signed genuine payment with HTTP 200');
  assert(webhookJson.status === 'activated', 'Webhook returned activation status', webhookJson.status);
  assert(webhookJson.member_id === memberBefore.id, 'Webhook activated matching member ID', webhookJson.member_id);

  // ---------------------------------------------------------------------------
  // 4. Database Post-Activation Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Database Post-Activation Verification ---');
  const { data: memberAfter } = await adminClient
    .from('members')
    .select('id, user_id, status, registration_payment_status, registration_payment_id, registration_order_id')
    .eq('id', memberBefore.id)
    .single();

  assert(memberAfter.status === 'active', 'Member status transitioned to active', memberAfter.status);
  assert(memberAfter.registration_payment_status === 'paid', 'registration_payment_status transitioned to paid');
  assert(memberAfter.registration_payment_id === paymentId, 'registration_payment_id permanently stores real Razorpay payment ID', memberAfter.registration_payment_id);
  assert(memberAfter.registration_order_id === orderId, 'registration_order_id strictly preserved', memberAfter.registration_order_id);

  // ---------------------------------------------------------------------------
  // 5. Negative Security Testing: Cross-Member Attack Scenarios
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Negative Cross-Member Security Testing ---');

  // Create Member B
  const timestamp = Date.now();
  const { data: uBAuth } = await adminClient.auth.admin.createUser({
    email: `memberB.security.${timestamp}@example.com`,
    password: 'SecurePassword123!',
    email_confirm: true,
  });

  const { data: basePlan } = await adminClient.from('membership_plans').select('id').ilike('slug', 'Base-membership%').single();

  await adminClient.rpc('create_member_profile_and_record', {
    p_user_id: uBAuth.user.id,
    p_first_name: 'MemberB',
    p_last_name: 'AttackerTarget',
    p_phone: '9876500005',
    p_address: 'Wokha',
    p_dob: '1998-05-05',
    p_plan_id: basePlan.id,
    p_membership_type: 'standard'
  });

  const orderB = await rzp.orders.create({
    amount: 1000,
    currency: 'INR',
    receipt: `reg_${uBAuth.user.id}`,
    notes: { userId: uBAuth.user.id, type: 'registration_fee' }
  });
  await adminClient.from('members').update({ registration_order_id: orderB.id }).eq('user_id', uBAuth.user.id);

  // Verify Member B is pending
  const { data: memberBInitial } = await adminClient.from('members').select('status, registration_payment_status').eq('user_id', uBAuth.user.id).single();
  assert(memberBInitial.status === 'pending_payment' && memberBInitial.registration_payment_status === 'pending', 'Member B initialized in pending_payment state');

  // Attack 1: User ID substitution in metadata
  // Present Member A legitimate payment and order, but tamper notes to point to Member B's userId
  const attack1Payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId, // Member A's order
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: uBAuth.user.id, // Malicious substitution!
            type: 'registration_fee'
          }
        }
      }
    }
  });

  const attack1Res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signPayload(attack1Payload),
    },
    body: attack1Payload
  });
  assert(attack1Res.status === 403, 'Attack 1: Malicious userId substitution rejected with HTTP 403 (Order-to-member mismatch)');

  const { data: memberBAfterAttack1 } = await adminClient.from('members').select('status, registration_payment_status').eq('user_id', uBAuth.user.id).single();
  assert(memberBAfterAttack1.status === 'pending_payment' && memberBAfterAttack1.registration_payment_status === 'pending', 'Member B remains in pending_payment after Attack 1');

  // Attack 2: Payment ID reuse/replay across members
  // Attacker presents Member B's valid order, but attempts to claim Member A's real captured payment ID
  const attack2Payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId, // Member A's captured payment ID
          order_id: orderB.id, // Member B's order
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: uBAuth.user.id,
            type: 'registration_fee'
          }
        }
      }
    }
  });

  const attack2Res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signPayload(attack2Payload),
    },
    body: attack2Payload
  });
  assert(attack2Res.status === 409, 'Attack 2: Replay of Member A payment ID on Member B order rejected with HTTP 409 (Conflict/Duplicate)');

  const { data: memberBAfterAttack2 } = await adminClient.from('members').select('status, registration_payment_status').eq('user_id', uBAuth.user.id).single();
  assert(memberBAfterAttack2.status === 'pending_payment' && memberBAfterAttack2.registration_payment_status === 'pending', 'Member B remains in pending_payment after Attack 2');

  // ---------------------------------------------------------------------------
  // 6. Idempotency & Duplicate Financial Charge Reconciliation
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Idempotency & Reconciliation Verification ---');

  // Duplicate webhook delivery for exact same payment
  const dupRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': webhookSignature,
    },
    body: realWebhookPayload
  });
  const dupJson = await dupRes.json();
  assert(dupRes.status === 200 && dupJson.status === 'already_processed' && dupJson.reason === 'duplicate_webhook', 'Duplicate webhook handled idempotently (duplicate_webhook)');

  // Distinct second captured payment for the same registration (double charge)
  const distinctSecondPaymentId = `pay_real_double_charge_${timestamp}`;
  const doubleChargePayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: distinctSecondPaymentId,
          order_id: orderId,
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: {
            userId: userId,
            type: 'registration_fee'
          }
        }
      }
    }
  });

  const doubleRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signPayload(doubleChargePayload),
    },
    body: doubleChargePayload
  });
  const doubleJson = await doubleRes.json();
  assert(
    doubleRes.status === 200 && 
    doubleJson.status === 'already_processed' && 
    doubleJson.reason === 'duplicate_financial_charge' && 
    doubleJson.reconciliation_logged === true,
    'Duplicate financial charge detected, absorbed idempotently, and logged for reconciliation'
  );

  // Verify Member A payment ID was NOT overwritten
  const { data: memberAFinal } = await adminClient.from('members').select('registration_payment_id').eq('id', memberBefore.id).single();
  assert(memberAFinal.registration_payment_id === paymentId, 'Original payment ID preserved without mutation on double charge', memberAFinal.registration_payment_id);

  console.log('\n========================================================================');
  console.log(`  ALL ${passed} PAYMENT OWNERSHIP & SECURITY ASSERTIONS PASSED!`);
  console.log('========================================================================\n');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
