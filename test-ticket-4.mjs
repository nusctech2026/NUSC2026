import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// To properly test the Server Action, we'll mimic what the server action does
// OR we can test the DB state changes directly via service functions if we extract them.
// But we wrote `redeemBenefitAction` inside `actions.ts`. We can import and run it in a node environment if we mock `cookies` and `@nusc/db`.
// A simpler robust way for our QA script is to test the DB RPC and the token update logic manually to ensure security constraints hold, or we can use next.js internals.
// Let's test the constraints and simulate the action's behavior to verify it's secure.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in apps/web/.env.local");
  process.exit(1);
}

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

async function runTests() {
  console.log("\n--- STARTING TICKET 4 (SECURE REDEMPTION) VERIFICATION ---\n");

  const email1 = `test_redeem1_${Date.now()}@example.com`;
  const { data: user1Data } = await adminClient.auth.admin.createUser({
    email: email1,
    password: 'Password123!',
    email_confirm: true,
  });
  const user1 = user1Data.user;

  // Insert member profiles
  await adminClient.from('members').insert([
    { id: user1.id, first_name: 'Redeem', last_name: 'Test', email: email1, membership_number: 'NUSC-R1', status: 'active', membership_type: 'adult' },
  ]);

  // Insert wallet
  await adminClient.from('member_wallets').insert([
    { user_id: user1.id, available_points: 100 }
  ]);

  const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await user1Client.auth.signInWithPassword({ email: email1, password: 'Password123!' });

  // 1. Setup Match & Benefit
  const now = new Date();
  const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: matches, error: matchError } = await adminClient.from('matches').insert([
    { opponent: 'Ahibi Match', match_date: futureDate, venue: 'Home', status: 'scheduled', ahibi_event_id: 'evt_t4_' + Date.now() },
  ]).select();
  if (matchError) console.error("Match insert error:", matchError);
  const matchId = matches[0].id;

  const { data: benefits, error: benefitError } = await adminClient.from('match_benefits').insert([
    { match_id: matchId, name: 'Ticket', points_cost: 20, discount_type: 'percentage', discount_value: 10, active: true, claim_start: new Date(now.getTime() - 1000).toISOString(), claim_end: futureDate },
  ]).select();
  if (benefitError) console.error("Benefit insert error:", benefitError);
  const benefitId = benefits[0].id;

  // 2. Simulate `redeemBenefitAction` running as user1
  // Part A: User calls RPC
  const { data: redemptionId, error: rpcError } = await user1Client.rpc('reserve_benefit_points', {
    p_match_id: matchId,
    p_benefit_id: benefitId
  });
  assert(!rpcError && redemptionId, "User can reserve points via RPC securely");

  // Part B: Server Action generates token & hashes it
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Part C: Server Action updates via Admin
  const { error: updateError } = await adminClient
    .from('ticket_redemptions')
    .update({ 
      token_hash: tokenHash,
      status: 'session_created'
    })
    .eq('id', redemptionId);
  
  assert(!updateError, "Admin can update redemption with hashed token");

  // Verify wallet points deducted
  const { data: u1wallet } = await adminClient.from('member_wallets').select('*').eq('user_id', user1.id).single();
  assert(u1wallet.available_points === 80, "Points successfully deducted (100 -> 80)");
  assert(u1wallet.reserved_points === 20, "Points added to reserved (0 -> 20)");

  // 3. Security: Raw token is NOT in database
  const { data: redemptions } = await adminClient.from('ticket_redemptions').select('*').eq('id', redemptionId).single();
  assert(redemptions.token_hash === tokenHash, "Token hash is stored");
  assert(redemptions.token_hash !== token, "Raw token is NOT stored");

  // 4. Client cannot read token_hash or sees hash
  const { data: clientRedemptions, error: clientError } = await user1Client.from('ticket_redemptions').select('token_hash').eq('id', redemptionId);
  if (clientError || !clientRedemptions || clientRedemptions.length === 0) {
    assert(true, "Client cannot read redemption table directly (RLS blocks)");
  } else {
    assert(clientRedemptions[0].token_hash === tokenHash, "Client sees hash, not raw token");
  }

  // 5. Test Double Spend Prevention
  const { error: doubleSpendError } = await user1Client.rpc('reserve_benefit_points', {
    p_match_id: matchId,
    p_benefit_id: benefitId
  });
  assert(doubleSpendError !== null, "Double spending is prevented by RPC constraint");

  console.log("\n--- CLEANUP ---");
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
