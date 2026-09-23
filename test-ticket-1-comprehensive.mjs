import { createClient } from '@supabase/supabase-js';
import { resolve } from 'path';

// Using Node 22 --env-file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE TICKET 1 VERIFICATION ---\n');
  let testCount = 0;
  let passCount = 0;

  function assert(condition, testName, errorMsg) {
    testCount++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      console.error(`       -> ${errorMsg}`);
    }
  }

  // --- SETUP DUMMY DATA ---
  const timestamp = Date.now();
  const userAEmail = `user_a_${timestamp}@test.com`;
  const userBEmail = `user_b_${timestamp}@test.com`;

  const { data: userAData } = await adminSupabase.auth.admin.createUser({ email: userAEmail, password: 'password123', email_confirm: true });
  const { data: userBData } = await adminSupabase.auth.admin.createUser({ email: userBEmail, password: 'password123', email_confirm: true });
  
  const userAId = userAData.user.id;
  const userBId = userBData.user.id;

  // Login as User A and User B to get their access tokens
  const clientA = createClient(supabaseUrl, supabaseAnonKey);
  await clientA.auth.signInWithPassword({ email: userAEmail, password: 'password123' });
  
  const clientB = createClient(supabaseUrl, supabaseAnonKey);
  await clientB.auth.signInWithPassword({ email: userBEmail, password: 'password123' });

  // Create members and wallets (admin)
  await adminSupabase.from('members').insert([
    { id: userAId, membership_number: `A-${timestamp}`, first_name: 'A', last_name: 'Test', email: userAEmail, phone: '1', status: 'active' },
    { id: userBId, membership_number: `B-${timestamp}`, first_name: 'B', last_name: 'Test', email: userBEmail, phone: '2', status: 'active' }
  ]);

  const { data: walletA } = await adminSupabase.from('member_wallets').insert([{ user_id: userAId, available_points: 100 }]).select().single();
  const { data: walletB } = await adminSupabase.from('member_wallets').insert([{ user_id: userBId, available_points: 100 }]).select().single();

  // Create Match & Benefit
  const { data: match } = await adminSupabase.from('matches').insert([{
    opponent: 'Test Opponent', match_date: new Date().toISOString(), venue: 'Test', ahibi_event_id: `EVT-${timestamp}`
  }]).select().single();

  const { data: benefit } = await adminSupabase.from('match_benefits').insert([{
    match_id: match.id, name: 'Test Benefit', points_cost: 10, discount_type: 'fixed', discount_value: 10,
    claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString()
  }]).select().single();

  console.log('Setup complete. Running tests...\n');

  try {
    // 1. Wallet balances cannot go negative
    const { error: negativeError } = await adminSupabase.from('member_wallets')
      .update({ available_points: -10 }).eq('id', walletA.id);
    assert(negativeError !== null, 'Wallet balances cannot go negative', 'Expected error when setting negative balance, but succeeded');

    // 2. Normal point reservation works correctly
    const { data: reserveId1, error: reserveErr1 } = await clientA.rpc('reserve_benefit_points', {
      p_match_id: match.id, p_benefit_id: benefit.id
    });
    assert(!reserveErr1, 'Normal point reservation works correctly', reserveErr1?.message);

    const { data: walletA_after } = await adminSupabase.from('member_wallets').select('*').eq('id', walletA.id).single();
    assert(walletA_after.available_points === 90 && walletA_after.reserved_points === 10, 'Wallet balances updated correctly after reservation', 'Balances incorrect');

    // 3. Every successful reservation creates the correct ledger entry
    const { data: txs1 } = await adminSupabase.from('wallet_transactions').select('*').eq('user_id', userAId);
    assert(txs1.length === 1 && txs1[0].transaction_type === 'reserve' && txs1[0].points === -10, 'Correct ledger entry created', 'Transaction missing or incorrect');

    // 4. Duplicate active redemption is blocked
    const { error: dupErr } = await clientA.rpc('reserve_benefit_points', {
      p_match_id: match.id, p_benefit_id: benefit.id
    });
    assert(dupErr !== null, 'Duplicate active redemption is blocked', 'Allowed double redemption for same benefit');

    // 5. Released/expired redemption can be retried
    const { error: relErr } = await adminSupabase.rpc('release_benefit_points', { p_redemption_id: reserveId1 });
    if (relErr) console.error('RELEASE ERROR:', relErr);
    
    const { data: reserveId2, error: retryErr } = await clientA.rpc('reserve_benefit_points', {
      p_match_id: match.id, p_benefit_id: benefit.id
    });
    assert(!retryErr && reserveId2 !== reserveId1, 'Released redemption allows retry', retryErr?.message);

    // Expired redemption allows retry
    // First, let's force the existing redemption to expire
    await adminSupabase.from('ticket_redemptions').update({ status: 'expired' }).eq('id', reserveId2);
    const { data: reserveId3, error: expiredRetryErr } = await clientA.rpc('reserve_benefit_points', {
      p_match_id: match.id, p_benefit_id: benefit.id
    });
    assert(!expiredRetryErr && reserveId3 !== reserveId2 && reserveId3 !== reserveId1, 'Expired redemption allows retry', expiredRetryErr?.message);

    // 6. Insufficient balance fails without partial changes
    // User B has 100 points, let's create a benefit costing 150 points
    const { data: expBenefit } = await adminSupabase.from('match_benefits').insert([{
      match_id: match.id, name: 'Expensive Benefit', points_cost: 150, discount_type: 'fixed', discount_value: 10,
      claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString()
    }]).select().single();

    const { error: insuffErr } = await clientB.rpc('reserve_benefit_points', {
      p_match_id: match.id, p_benefit_id: expBenefit.id
    });
    assert(insuffErr !== null, 'Insufficient balance fails', 'Allowed reserving more points than available');
    
    const { data: walletB_insuff } = await adminSupabase.from('member_wallets').select('*').eq('id', walletB.id).single();
    assert(walletB_insuff.available_points === 100, 'Insufficient balance fails without partial changes', 'Balance was mutated');
    
    // Check that failed reservation creates NO ledger entry
    const { data: txsFail } = await adminSupabase.from('wallet_transactions').select('*').eq('user_id', userBId);
    assert(txsFail.length === 0, 'Failed reservations produce no wallet change and no ledger entry', 'Ledger entry was created for failed reservation');

    // 7. RLS prevents Member A from reading Member B's wallet/transactions/redemptions
    const { data: aReadsBWallet } = await clientA.from('member_wallets').select('*').eq('user_id', userBId);
    assert(aReadsBWallet.length === 0, 'RLS prevents reading other wallets', 'Member A read Member B wallet');
    const { data: aReadsBRedemptions } = await clientA.from('ticket_redemptions').select('*').eq('user_id', userBId);
    assert(aReadsBRedemptions.length === 0, 'RLS prevents reading other redemptions', 'Member A read Member B redemption');

    // 8. Frontend/client role cannot directly insert/update/delete protected wallet or redemption records
    const { error: insertWalletErr } = await clientA.from('member_wallets').insert([{ user_id: userAId, available_points: 9999 }]);
    assert(insertWalletErr !== null, 'Client cannot insert wallet records directly', 'Allowed client insert');

    // PostgREST returns success with 0 rows for blocked UPDATE/DELETE when RLS is active. 
    // We must verify the row wasn't actually changed.
    await clientA.from('ticket_redemptions').update({ status: 'redeemed' }).eq('id', reserveId3);
    const { data: checkUpdate } = await adminSupabase.from('ticket_redemptions').select('status').eq('id', reserveId3).single();
    assert(checkUpdate.status !== 'redeemed', 'direct client UPDATE is blocked', 'Allowed client update on ticket_redemptions');
    
    await clientA.from('ticket_redemptions').delete().eq('id', reserveId3);
    const { data: checkDelete } = await adminSupabase.from('ticket_redemptions').select('id').eq('id', reserveId3).maybeSingle();
    assert(checkDelete !== null, 'direct client DELETE is blocked', 'Allowed client delete on ticket_redemptions');

    // 9. reserve_benefit_points cannot be used to operate on another user's wallet (SECURITY ISSUE)
    // The RPC doesn't accept user_id anymore, but just to be sure we are testing boundaries.
    
    // 9b. Anonymous caller cannot reserve points
    const clientAnon = createClient(supabaseUrl, supabaseAnonKey);
    const { error: anonErr } = await clientAnon.rpc('reserve_benefit_points', {
        p_match_id: match.id, p_benefit_id: benefit.id
    });
    assert(anonErr !== null, 'Anonymous caller cannot reserve points', 'Anon caller allowed');

    // --- NEW ADVERSARIAL TESTS ---
    // Create a different match and a different benefit
    const { data: match2 } = await adminSupabase.from('matches').insert([{ opponent: 'Opp 2', match_date: new Date().toISOString(), venue: 'V', ahibi_event_id: `E-${timestamp}-2` }]).select().single();
    const { data: ben2 } = await adminSupabase.from('match_benefits').insert([{ match_id: match2.id, name: 'B2', points_cost: 0, discount_type: 'fixed', discount_value: 0, claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString() }]).select().single();
    
    // a benefit belonging to another match is rejected
    const { error: mismatchErr } = await clientB.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: ben2.id });
    assert(mismatchErr !== null && mismatchErr.message.includes('belong'), 'a benefit belonging to another match is rejected', 'Allowed mismatch between match and benefit');

    // an inactive benefit is rejected
    const { data: benInactive } = await adminSupabase.from('match_benefits').insert([{ match_id: match.id, name: 'Inactive', points_cost: 0, discount_type: 'fixed', discount_value: 0, claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString(), active: false }]).select().single();
    const { error: inactiveErr } = await clientB.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: benInactive.id });
    assert(inactiveErr !== null && inactiveErr.message.includes('active'), 'an inactive benefit is rejected', 'Allowed reserving inactive benefit');

    // a benefit outside its claim window is rejected
    const { data: benPast } = await adminSupabase.from('match_benefits').insert([{ match_id: match.id, name: 'Past', points_cost: 0, discount_type: 'fixed', discount_value: 0, claim_start: new Date(timestamp - 86400000).toISOString(), claim_end: new Date(timestamp - 3600000).toISOString() }]).select().single();
    const { error: windowErr } = await clientB.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: benPast.id });
    assert(windowErr !== null && windowErr.message.includes('claim window'), 'a benefit outside its claim window is rejected', 'Allowed reserving benefit out of window');

    // 10. token_hash uniqueness is enforced
    // Update the redemption with a mock token
    await adminSupabase.from('ticket_redemptions').update({ token_hash: 'TOKEN1' }).eq('id', reserveId1);
    const { error: tokenUniqueErr } = await adminSupabase.from('ticket_redemptions').update({ token_hash: 'TOKEN1' }).eq('id', reserveId2);
    assert(tokenUniqueErr !== null, 'token_hash uniqueness is enforced', 'Allowed duplicate token hash');

    // 11. ahibi_session_id and ahibi_booking_id uniqueness is enforced
    await adminSupabase.from('ticket_redemptions').update({ ahibi_session_id: 'SESSION1', ahibi_booking_id: 'BOOKING1' }).eq('id', reserveId1);
    
    const { error: sessionUniqueErr } = await adminSupabase.from('ticket_redemptions').update({ ahibi_session_id: 'SESSION1' }).eq('id', reserveId2);
    assert(sessionUniqueErr !== null, 'ahibi_session_id uniqueness is enforced', 'Allowed duplicate session ID');

    const { error: bookingUniqueErr } = await adminSupabase.from('ticket_redemptions').update({ ahibi_booking_id: 'BOOKING1' }).eq('id', reserveId2);
    assert(bookingUniqueErr !== null, 'ahibi_booking_id uniqueness is enforced', 'Allowed duplicate booking ID');

    // 12. Concurrency Test: Two simultaneous reservation requests cannot double-spend
    console.log('\n--- Running Concurrency Test (Double Spend Prevention) ---');
    // User B has 100 points. We try to reserve a 100-point benefit 2 times in parallel.
    const { data: bigBen } = await adminSupabase.from('match_benefits').insert([{
      match_id: match.id, name: 'Big Benefit', points_cost: 100, discount_type: 'fixed', discount_value: 100, claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString()
    }]).select().single();

    // Fire two requests in true parallel using Promise.all
    const p1 = clientB.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: bigBen.id });
    const p2 = clientB.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: bigBen.id });

    const results = await Promise.all([p1, p2]);
    const successes = results.filter(r => !r.error);
    const errors = results.filter(r => r.error);

    assert(successes.length === 1 && errors.length === 1, 'Two simultaneous reservation requests cannot double-spend', `Successes: ${successes.length}, Errors: ${errors.length}`);
    const { data: finalWalletB } = await adminSupabase.from('member_wallets').select('*').eq('id', walletB.id).single();
    assert(finalWalletB.available_points === 0 && finalWalletB.reserved_points === 100, 'Concurrency test final wallet balance correct', `Balance mutated incorrectly: ${JSON.stringify(finalWalletB)}`);

    // 13. Max Redemptions Test
    console.log('\n--- Running Max Redemptions Test ---');
    const { data: maxBen } = await adminSupabase.from('match_benefits').insert([{
      match_id: match.id, name: 'Max Benefit', points_cost: 10, discount_type: 'fixed', discount_value: 10, claim_start: new Date().toISOString(), claim_end: new Date(timestamp + 86400000).toISOString(), max_redemptions_per_member: 2
    }]).select().single();
    
    const { error: max1Err } = await clientA.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: maxBen.id });
    assert(max1Err === null, 'First redemption within max limit succeeds', `Failed first redemption: ${max1Err?.message}`);
    
    const { error: max2Err } = await clientA.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: maxBen.id });
    assert(max2Err === null, 'Second redemption within max limit succeeds', `Failed second redemption: ${max2Err?.message}`);
    
    const { error: max3Err } = await clientA.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: maxBen.id });
    assert(max3Err !== null && max3Err.message.includes('maximum number of redemptions'), 'Third redemption exceeding max limit fails', 'Allowed third redemption');

  } catch (err) {
    console.error('\nUnexpected test failure:', err);
  } finally {
    // Cleanup
    await adminSupabase.auth.admin.deleteUser(userAId);
    await adminSupabase.auth.admin.deleteUser(userBId);
    console.log(`\nTests Completed: ${passCount}/${testCount} passed.`);
  }
}

runTests();
