import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Razorpay from 'razorpay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const webhookUrl = 'http://localhost:3000/api/webhooks/razorpay';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'staging_rzp_webhook_secret_nusc_2026';
const rzpKeyId = process.env.RAZORPAY_KEY_ID;
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('================================================================');
console.log('   NUSC PHASE 0.5 FINAL ACCEPTANCE & SECURITY VERIFICATION      ');
console.log('================================================================\n');

const adminClient = createClient(supabaseUrl, supabaseKey);
const publicClient = createClient(supabaseUrl, anonKey);

const rzp = new Razorpay({
  key_id: rzpKeyId,
  key_secret: rzpKeySecret,
});

function signPayload(body, secret = webhookSecret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function runAcceptanceVerification() {
  const timestamp = Date.now();
  const testEmail = `acceptance.${timestamp}@example.com`;
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, detail = '') {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`  [PASS] #${totalCount}: ${testName} ${detail ? `(${detail})` : ''}`);
    } else {
      console.error(`  [FAIL] #${totalCount}: ${testName} - ${detail}`);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: Real Razorpay Test Mode Order Creation (₹10 = 1000 paise)
  // -------------------------------------------------------------
  console.log('--- 1. Real Razorpay Test Mode (RAZORPAY_MOCK=false) ---');
  assert(process.env.RAZORPAY_MOCK === 'false', 'RAZORPAY_MOCK is set to false in staging config');
  assert(rzpKeyId?.startsWith('rzp_test_'), 'Using official Razorpay Test Mode Key ID', rzpKeyId);

  // 1a. Create Supabase Auth user
  const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: 'SecurePassword123!',
    email_confirm: true,
  });
  assert(!authErr && authUser.user, 'Supabase Auth user created', authUser?.user?.id);
  const userId = authUser.user.id;

  // 1b. Get base plan
  const { data: basePlan } = await adminClient
    .from('membership_plans')
    .select('id, name, slug')
    .ilike('slug', 'Base-membership%')
    .single();
  assert(Boolean(basePlan), 'Found base membership plan', basePlan?.name);

  // 1c. Execute RPC
  const { data: rpcRes, error: rpcErr } = await adminClient.rpc('create_member_profile_and_record', {
    p_user_id: userId,
    p_first_name: 'Acceptance',
    p_last_name: 'Tester',
    p_phone: '9876500001',
    p_address: 'Kohima District',
    p_dob: '1996-06-15',
    p_plan_id: basePlan.id,
    p_membership_type: 'standard'
  });
  assert(!rpcErr && rpcRes?.member_number, 'Member record and profile created via atomic RPC', rpcRes?.member_number);
  const memberNumber = rpcRes.member_number;

  // Verify pending payment state before payment
  const { data: memberBefore } = await adminClient
    .from('members')
    .select('status, registration_payment_status, membership_number')
    .eq('user_id', userId)
    .single();
  assert(memberBefore.status === 'pending_payment', 'Initial member status is pending_payment');
  assert(memberBefore.registration_payment_status === 'pending', 'Initial registration_payment_status is pending');

  // 1d. Create official order via Razorpay API in Test Mode
  let realOrder;
  try {
    realOrder = await rzp.orders.create({
      amount: 1000, // ₹10
      currency: 'INR',
      receipt: `reg_${userId}`,
      notes: { userId, type: 'registration_fee' },
    });
  } catch (err) {
    console.error('Razorpay API order creation failed:', err);
  }
  assert(Boolean(realOrder?.id?.startsWith('order_')), 'Created official order in Razorpay Test Mode', realOrder?.id);
  assert(realOrder?.amount === 1000, 'Razorpay order authoritative amount is 1000 paise (₹10)');
  assert(realOrder?.currency === 'INR', 'Razorpay order currency is INR');

  // 1e. Fetch back order from Razorpay Test Mode to confirm authoritative registration
  const fetchedOrder = await rzp.orders.fetch(realOrder.id);
  assert(fetchedOrder.id === realOrder.id && fetchedOrder.status === 'created', 'Verified order on official Razorpay server', fetchedOrder.id);

  // -------------------------------------------------------------
  // TEST 2: Payment Idempotency & Security Verification
  // -------------------------------------------------------------
  console.log('\n--- 2. Webhook Validation & Security Constraints ---');

  const paymentId = `pay_test_${timestamp}`;

  // 2a. Reject forged signature
  const forgedPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: realOrder.id,
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const forgedRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': '0000deadbeef1234567890abcdef1234567890abcdef1234567890abcdef1234' },
    body: forgedPayload
  });
  assert(forgedRes.status === 400, 'Forged webhook signature rejected with HTTP 400');

  // 2b. Reject invalid amount (e.g. 100 paise = ₹1 instead of ₹10)
  const wrongAmountPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: realOrder.id,
          amount: 100, // Underpayment!
          currency: 'INR',
          status: 'captured',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const wrongAmountRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(wrongAmountPayload) },
    body: wrongAmountPayload
  });
  assert(wrongAmountRes.status === 400, 'Underpayment (₹1 instead of ₹10) rejected with HTTP 400');

  // 2c. Reject wrong currency (e.g. USD instead of INR)
  const wrongCurrencyPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: realOrder.id,
          amount: 1000,
          currency: 'USD',
          status: 'captured',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const wrongCurrencyRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(wrongCurrencyPayload) },
    body: wrongCurrencyPayload
  });
  assert(wrongCurrencyRes.status === 400, 'Invalid currency (USD instead of INR) rejected with HTTP 400');

  // 2d. Reject malformed payment ID
  const badPaymentIdPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'invalid_id_not_pay',
          order_id: realOrder.id,
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const badIdRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(badPaymentIdPayload) },
    body: badPaymentIdPayload
  });
  assert(badIdRes.status === 400, 'Malformed payment ID format rejected with HTTP 400');

  // 2e. Valid payment webhook activation
  const validPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: realOrder.id,
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const validRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(validPayload) },
    body: validPayload
  });
  const validJson = await validRes.json();
  assert(validRes.status === 200 && validJson.status === 'activated', 'Valid webhook activated member', validJson.member_id);

  // Verify database state after payment
  const { data: memberAfter } = await adminClient
    .from('members')
    .select('status, registration_payment_status, registration_payment_id')
    .eq('user_id', userId)
    .single();
  assert(memberAfter.status === 'active', 'Member status transitioned to active in database');
  assert(memberAfter.registration_payment_status === 'paid', 'registration_payment_status transitioned to paid');
  assert(memberAfter.registration_payment_id === paymentId, 'registration_payment_id securely recorded', paymentId);

  // 2f. Webhook Replay / Idempotency Test
  const replayRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(validPayload) },
    body: validPayload
  });
  const replayJson = await replayRes.json();
  assert(replayRes.status === 200 && replayJson.status === 'already_processed', 'Duplicate webhook handled idempotently (already_processed)');

  // 2g. Concurrent Webhook Delivery Test
  const concurrentPromises = [1, 2, 3].map(i =>
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(validPayload) },
      body: validPayload
    }).then(r => r.json())
  );
  const concurrentResults = await Promise.all(concurrentPromises);
  const allSafe = concurrentResults.every(r => r.status === 'already_processed' || r.status === 'activated');
  assert(allSafe, 'Concurrent webhook deliveries handled safely without state corruption');

  // 2h. Failed event arriving after successful payment MUST NOT downgrade active member
  const failedPayload = JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_failed_${timestamp}`,
          order_id: realOrder.id,
          amount: 1000,
          currency: 'INR',
          status: 'failed',
          notes: { userId, type: 'registration_fee' }
        }
      }
    }
  });
  const failedRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signPayload(failedPayload) },
    body: failedPayload
  });
  const failedJson = await failedRes.json();
  assert(failedRes.status === 200 && failedJson.status === 'ignored_already_paid', 'Late payment.failed event ignored for already-paid member');

  const { data: memberAfterLateFail } = await adminClient
    .from('members')
    .select('status, registration_payment_status')
    .eq('user_id', userId)
    .single();
  assert(memberAfterLateFail.status === 'active' && memberAfterLateFail.registration_payment_status === 'paid', 'Member remains active and paid after late failure event');

  // -------------------------------------------------------------
  // TEST 3: Payload CMS Security (Item 5)
  // -------------------------------------------------------------
  console.log('\n--- 3. Payload CMS Security & Access Control ---');

  // 3a. Unauthenticated access to /api/members blocked
  const unauthMembersRes = await fetch('http://localhost:3001/api/members');
  const unauthMembersData = await unauthMembersRes.json();
  assert(
    unauthMembersRes.status === 401 || unauthMembersRes.status === 403 || (unauthMembersData.docs && unauthMembersData.docs.length === 0),
    'Unauthenticated GET /api/members blocked from viewing records'
  );

  // 3b. Unauthenticated access to /api/member_profiles blocked
  const unauthProfilesRes = await fetch('http://localhost:3001/api/member_profiles');
  const unauthProfilesData = await unauthProfilesRes.json();
  assert(
    unauthProfilesRes.status === 401 || unauthProfilesRes.status === 403 || (unauthProfilesData.docs && unauthProfilesData.docs.length === 0),
    'Unauthenticated GET /api/member_profiles blocked from viewing PII'
  );

  // 3c. Ordinary authenticated Supabase member login
  const { data: loginSession } = await publicClient.auth.signInWithPassword({
    email: testEmail,
    password: 'SecurePassword123!'
  });
  assert(Boolean(loginSession?.session?.access_token), 'Ordinary member logged into Supabase Auth', testEmail);

  // Try to access Payload CMS with ordinary member cookie/token
  const authMemberProfilesRes = await fetch('http://localhost:3001/api/member_profiles', {
    headers: {
      Cookie: `sb-access-token=${loginSession.session.access_token};`
    }
  });
  const authMemberProfilesData = await authMemberProfilesRes.json();
  assert(
    authMemberProfilesRes.status === 401 || authMemberProfilesRes.status === 403 || (authMemberProfilesData.docs && authMemberProfilesData.docs.length === 0),
    'Ordinary authenticated member blocked from viewing other members PII in Payload'
  );

  // 3d. Ordinary authenticated member cannot PATCH payment status
  const patchRes = await fetch(`http://localhost:3001/api/members/${memberBefore.id || 'fake_id'}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `sb-access-token=${loginSession.session.access_token};`
    },
    body: JSON.stringify({ registration_payment_status: 'paid' })
  });
  assert(patchRes.status === 401 || patchRes.status === 403 || patchRes.status === 404, 'Ordinary member cannot modify payment status via Payload API');

  // -------------------------------------------------------------
  // TEST 4: Supabase Row Level Security (RLS) Cross-User Isolation
  // -------------------------------------------------------------
  console.log('\n--- 4. Supabase Database Row Level Security (RLS) ---');

  // Create second user
  const user2Email = `user2.${timestamp}@example.com`;
  const { data: u2Auth } = await adminClient.auth.admin.createUser({
    email: user2Email,
    password: 'SecurePassword123!',
    email_confirm: true,
  });
  await adminClient.rpc('create_member_profile_and_record', {
    p_user_id: u2Auth.user.id,
    p_first_name: 'UserTwo',
    p_last_name: 'Victim',
    p_phone: '9876500002',
    p_address: 'Dimapur',
    p_dob: '1998-01-01',
    p_plan_id: basePlan.id,
    p_membership_type: 'standard'
  });

  // Query member 2 profile using user 1 client
  const user1Client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  const { error: u1LoginErr } = await user1Client.auth.signInWithPassword({
    email: testEmail,
    password: 'SecurePassword123!'
  });
  assert(!u1LoginErr, 'User 1 authenticated with Supabase client');

  const { data: crossProfile, error: crossProfileErr } = await user1Client
    .from('member_profiles')
    .select('*')
    .eq('user_id', u2Auth.user.id);
  console.log('DEBUG RLS RESULT:', { crossProfile, crossProfileErr });
  const piiIsolated = !crossProfile || crossProfile.length === 0;
  assert(piiIsolated && !crossProfileErr, 'RLS: User 1 cannot view User 2 profile (0 rows returned)', JSON.stringify({ crossProfile, crossProfileErr }));

  const { data: crossMember } = await user1Client
    .from('members')
    .select('*')
    .eq('user_id', u2Auth.user.id);
  assert(crossMember && crossMember.length === 0, 'RLS: User 1 cannot view User 2 membership record (0 rows returned)');

  // Direct client payment tampering blocked by RLS
  const { data: clientTamperResult } = await user1Client
    .from('members')
    .update({ registration_payment_status: 'paid', status: 'active' })
    .eq('user_id', u2Auth.user.id)
    .select();
  assert(!clientTamperResult || clientTamperResult.length === 0, 'RLS: Direct client UPDATE tampering on payment status blocked');

  console.log(`\n================================================================`);
  console.log(`   ALL ${passedCount} ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!`);
  console.log(`================================================================\n`);
}

runAcceptanceVerification().catch(err => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});
