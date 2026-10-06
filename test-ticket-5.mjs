import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    failed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// Simple fetch wrapper since we uninstalled node-fetch earlier. 
// We are in Node 18+ so native fetch is available.
async function apiCall(endpoint, payload) {
  const url = `http://localhost:3000/api/integrations/ahibi/redemptions/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test_secret'
    },
    body: JSON.stringify(payload)
  });
  return { status: res.status, data: await res.json() };
}

async function runTests() {
  console.log("\n--- STARTING TICKET 5 (AHIBI API) VERIFICATION ---\n");

  const email1 = `test_ahibi1_${Date.now()}@example.com`;
  const { data: user1Data } = await adminClient.auth.admin.createUser({
    email: email1,
    password: 'Password123!',
    email_confirm: true,
  });
  const user1 = user1Data.user;

  await adminClient.from('members').insert([
    { id: user1.id, first_name: 'Ahibi', last_name: 'Test', email: email1, membership_number: 'NUSC-A1', status: 'active', membership_type: 'adult' },
  ]);

  await adminClient.from('member_wallets').insert([
    { user_id: user1.id, available_points: 100 }
  ]);

  const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await user1Client.auth.signInWithPassword({ email: email1, password: 'Password123!' });

  const now = new Date();
  const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  
  const ahibiEventId = 'evt_t5_' + Date.now();
  const { data: matches } = await adminClient.from('matches').insert([
    { opponent: 'Ahibi Match 2', match_date: futureDate, venue: 'Home', status: 'scheduled', ahibi_event_id: ahibiEventId },
  ]).select();
  const matchId = matches[0].id;

  const { data: benefits } = await adminClient.from('match_benefits').insert([
    { match_id: matchId, name: 'Ticket', points_cost: 20, discount_type: 'percentage', discount_value: 10, active: true, claim_start: new Date(now.getTime() - 1000).toISOString(), claim_end: futureDate },
  ]).select();
  const benefitId = benefits[0].id;

  // Simulate reserving points & token generation
  const { data: redemptionId } = await user1Client.rpc('reserve_benefit_points', { p_match_id: matchId, p_benefit_id: benefitId });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await adminClient.from('ticket_redemptions').update({ token_hash: tokenHash, status: 'session_created' }).eq('id', redemptionId);

  // Test 1: Validate endpoint
  const sessionId = 'session_' + Date.now();
  const validateRes = await apiCall('validate', {
    authorization: token,
    eventId: ahibiEventId,
    sessionId: sessionId
  });

  if (validateRes.status !== 200 || validateRes.data.valid !== true) {
    console.error("Validate Failed:", validateRes);
  }

  assert(validateRes.status === 200 && validateRes.data.valid === true, "Ahibi validate successfully verifies token and binds session");
  assert(validateRes.data.discount.value === 10, "Validate returns correct discount value");

  // Re-validating should fail since it's already bound
  const validateRes2 = await apiCall('validate', {
    authorization: token,
    eventId: ahibiEventId,
    sessionId: sessionId
  });
  assert(validateRes2.status === 400 && validateRes2.data.valid === false, "Re-validating used token is rejected");

  // Verify DB state
  const { data: dbState1 } = await adminClient.from('ticket_redemptions').select('*').eq('id', redemptionId).single();
  assert(dbState1.status === 'session_created', "Status remains session_created");
  assert(dbState1.ahibi_session_id === sessionId, "Session ID stored correctly");

  // Test 2: Complete endpoint
  const completeRes = await apiCall('complete', {
    redemptionId,
    sessionId,
    eventId: ahibiEventId,
    bookingId: 'book_' + Date.now()
  });

  if (completeRes.status !== 200) {
    console.error("Complete endpoint failed:", completeRes.data);
  }

  assert(completeRes.status === 200, "Ahibi complete processes successfully");

  // Verify wallet
  const { data: wallet1 } = await adminClient.from('member_wallets').select('*').eq('user_id', user1.id).single();
  assert(wallet1.available_points === 80, "Available points remain 80");
  assert(wallet1.reserved_points === 0, "Reserved points drop to 0");
  assert(wallet1.spent_points === 20, "Spent points increase to 20");

  const { data: dbState2 } = await adminClient.from('ticket_redemptions').select('*').eq('id', redemptionId).single();
  assert(dbState2.status === 'redeemed', "Status updated to redeemed");

  // Test 3: Idempotency
  const completeRes2 = await apiCall('complete', { redemptionId, sessionId, eventId: ahibiEventId, bookingId: 'book_x' });
  assert(completeRes2.status === 200 && completeRes2.data.message === 'Already redeemed', "Complete is idempotent");

  // Test 4: Failure/Release Path
  // Let's create another redemption and fail it.
  const { data: benefits2 } = await adminClient.from('match_benefits').insert([
    { match_id: matchId, name: 'Ticket 2', points_cost: 20, discount_type: 'percentage', discount_value: 10, active: true, claim_start: new Date(now.getTime() - 1000).toISOString(), claim_end: futureDate },
  ]).select();
  const benefitId2 = benefits2[0].id;

  const { data: redemptionId2, error: resErr } = await user1Client.rpc('reserve_benefit_points', { p_match_id: matchId, p_benefit_id: benefitId2 });
  if (resErr) { console.error("Reserve error:", resErr); }
  const token2 = crypto.randomBytes(32).toString('hex');
  const tokenHash2 = crypto.createHash('sha256').update(token2).digest('hex');
  await adminClient.from('ticket_redemptions').update({ token_hash: tokenHash2, status: 'session_created' }).eq('id', redemptionId2);

  const sessionId2 = 'session2_' + Date.now();
  await apiCall('validate', { authorization: token2, eventId: ahibiEventId, sessionId: sessionId2 });

  const failRes = await apiCall('failed', { redemptionId: redemptionId2, sessionId: sessionId2, eventId: ahibiEventId });
  if (failRes.status !== 200) {
    console.error("Failed endpoint failed:", failRes.data);
  }
  assert(failRes.status === 200, "Ahibi failed endpoint processes successfully");

  // Verify wallet
  const { data: wallet2 } = await adminClient.from('member_wallets').select('*').eq('user_id', user1.id).single();
  assert(wallet2.available_points === 80, "Available points return to 80"); // started with 80 (since 20 were spent). 80 - 20 (reserved) + 20 (released) = 80
  assert(wallet2.reserved_points === 0, "Reserved points drop to 0");

  const { data: dbState3 } = await adminClient.from('ticket_redemptions').select('*').eq('id', redemptionId2).single();
  assert(dbState3.status === 'released', "Status updated to released");

  // Cleanup
  await adminClient.auth.admin.deleteUser(user1.id);

  if (failed) {
    console.error("\n[RESULT] QA/Security tests failed.");
    process.exit(1);
  } else {
    console.log("\n[RESULT] All QA/Security tests passed!");
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error("Test framework error:", e);
  process.exit(1);
});
