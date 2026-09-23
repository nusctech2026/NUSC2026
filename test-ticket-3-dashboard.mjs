import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
  console.log("\n--- STARTING TICKET 3 (DASHBOARD) VERIFICATION ---\n");

  const email1 = `test_dash1_${Date.now()}@example.com`;
  const email2 = `test_dash2_${Date.now()}@example.com`;

  // 1. Setup Test Users
  const { data: user1Data } = await adminClient.auth.admin.createUser({
    email: email1,
    password: 'Password123!',
    email_confirm: true,
  });
  const user1 = user1Data.user;

  const { data: user2Data } = await adminClient.auth.admin.createUser({
    email: email2,
    password: 'Password123!',
    email_confirm: true,
  });
  const user2 = user2Data.user;

  // Insert member profiles
  await adminClient.from('members').insert([
    { id: user1.id, first_name: 'Dash1', last_name: 'Test1', email: email1, membership_number: 'NUSC-DASH1', status: 'active', membership_type: 'adult' },
    { id: user2.id, first_name: 'Dash2', last_name: 'Test2', email: email2, membership_number: 'NUSC-DASH2', status: 'active', membership_type: 'adult' }
  ]);

  // Insert wallets (initially empty)
  await adminClient.from('member_wallets').insert([
    { user_id: user1.id, available_points: 100 },
    { user_id: user2.id, available_points: 50 }
  ]);

  // Create Auth Clients for tests
  const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await user1Client.auth.signInWithPassword({ email: email1, password: 'Password123!' });

  const user2Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await user2Client.auth.signInWithPassword({ email: email2, password: 'Password123!' });

  // -----------------------------------------------------
  // Security Tests (Cross-User Isolation & Read Only)
  // -----------------------------------------------------
  const { data: u1wallet, error: err1 } = await user1Client.from('member_wallets').select('*');
  assert(!err1 && u1wallet.length === 1 && u1wallet[0].user_id === user1.id, "User 1 can read own wallet");

  // User 1 cannot update wallet directly
  await user1Client.from('member_wallets').update({ available_points: 999 }).eq('user_id', user1.id);
  const { data: u1walletAfter } = await user1Client.from('member_wallets').select('*');
  assert(u1walletAfter[0].available_points === 100, "User 1 cannot update wallet directly");

  // User 1 cannot see User 2's wallet
  const { data: u1seeingU2 } = await user1Client.from('member_wallets').select('*').eq('user_id', user2.id);
  assert(u1seeingU2.length === 0, "User 1 cannot see User 2 wallet");

  // Proof no mutations occur from simple selects
  const beforeTransactions = await adminClient.from('wallet_transactions').select('*').eq('user_id', user1.id);
  // Simulating dashboard fetch...
  await user1Client.from('member_wallets').select('available_points').eq('user_id', user1.id).single();
  const afterTransactions = await adminClient.from('wallet_transactions').select('*').eq('user_id', user1.id);
  assert(beforeTransactions.data.length === afterTransactions.data.length, "Dashboard reads cause no ledger mutations");

  // -----------------------------------------------------
  // Data Logic Tests (Matches & Claim Windows)
  // -----------------------------------------------------
  
  // Setup matches
  const now = new Date();
  const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(); // +2 days
  const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // -2 days
  
  const { data: matches } = await adminClient.from('matches').insert([
    { opponent: 'Future Scheduled', match_date: futureDate, venue: 'Home', status: 'scheduled' }, // Should return
    { opponent: 'Past Scheduled', match_date: pastDate, venue: 'Away', status: 'scheduled' },     // Should NOT return
    { opponent: 'Future Completed', match_date: futureDate, venue: 'Home', status: 'completed' }, // Should NOT return
  ]).select();

  const mFutureScheduled = matches.find(m => m.opponent === 'Future Scheduled');
  const mPastScheduled = matches.find(m => m.opponent === 'Past Scheduled');

  // Dashboard logic: status = 'scheduled' and match_date >= now
  const { data: fetchedMatches } = await user1Client
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .gte('match_date', now.toISOString())
    .order('match_date', { ascending: true });

  assert(fetchedMatches.some(m => m.id === mFutureScheduled.id), "Fetches future scheduled matches");
  assert(!fetchedMatches.some(m => m.id === mPastScheduled.id), "Ignores stale scheduled matches (past date)");
  assert(!fetchedMatches.some(m => m.status === 'completed'), "Ignores completed matches");

  // Setup Benefits with Claim Windows
  const windowOpen = new Date(now.getTime() - 10000).toISOString();
  const windowClose = new Date(now.getTime() + 10000).toISOString();
  
  await adminClient.from('match_benefits').insert([
    { match_id: mFutureScheduled.id, name: 'Always Available (Null)', points_cost: 10, discount_type: 'fixed', discount_value: 5, active: true, claim_start: null, claim_end: null },
    { match_id: mFutureScheduled.id, name: 'Active Window', points_cost: 10, discount_type: 'fixed', discount_value: 5, active: true, claim_start: windowOpen, claim_end: windowClose },
    { match_id: mFutureScheduled.id, name: 'Upcoming Window', points_cost: 10, discount_type: 'fixed', discount_value: 5, active: true, claim_start: futureDate, claim_end: futureDate },
    { match_id: mFutureScheduled.id, name: 'Closed Window', points_cost: 10, discount_type: 'fixed', discount_value: 5, active: true, claim_start: pastDate, claim_end: pastDate },
    { match_id: mFutureScheduled.id, name: 'Inactive Benefit', points_cost: 10, discount_type: 'fixed', discount_value: 5, active: false, claim_start: null, claim_end: null },
  ]);

  const { data: fetchedBenefits } = await user1Client
    .from('match_benefits')
    .select('*')
    .eq('match_id', mFutureScheduled.id)
    .eq('active', true);

  assert(!fetchedBenefits.some(b => b.name === 'Inactive Benefit'), "Ignores inactive benefits");

  // Logic mimicking the dashboard's JS computation
  let allWindowsCorrect = true;
  for (const b of fetchedBenefits) {
    let claimState = 'unavailable';
    const claimStart = b.claim_start ? new Date(b.claim_start) : null;
    const claimEnd = b.claim_end ? new Date(b.claim_end) : null;
    const currentTime = new Date();

    if (!claimStart && !claimEnd) {
      claimState = 'available';
    } else if (claimStart && currentTime < claimStart) {
      claimState = 'upcoming';
    } else if (claimEnd && currentTime > claimEnd) {
      claimState = 'closed';
    } else {
      claimState = 'available';
    }

    if (b.name === 'Always Available (Null)' && claimState !== 'available') allWindowsCorrect = false;
    if (b.name === 'Active Window' && claimState !== 'available') allWindowsCorrect = false;
    if (b.name === 'Upcoming Window' && claimState !== 'upcoming') allWindowsCorrect = false;
    if (b.name === 'Closed Window' && claimState !== 'closed') allWindowsCorrect = false;
  }
  assert(allWindowsCorrect, "Claim window boundaries properly computed");

  // Unauthenticated access
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  const { data: anonWallet, error: anonErr } = await anonClient.from('member_wallets').select('*');
  assert(anonWallet.length === 0, "Unauthenticated user cannot read any wallets");

  // Missing wallet
  const email3 = `test_dash3_${Date.now()}@example.com`;
  const { data: user3Data } = await adminClient.auth.admin.createUser({
    email: email3,
    password: 'Password123!',
    email_confirm: true,
  });
  const user3 = user3Data.user;
  const user3Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  await user3Client.auth.signInWithPassword({ email: email3, password: 'Password123!' });
  const { data: u3wallet } = await user3Client.from('member_wallets').select('*');
  assert(u3wallet.length === 0, "Missing wallet gracefully returns empty");

  console.log("\n--- CLEANUP ---");
  await adminClient.auth.admin.deleteUser(user1.id);
  await adminClient.auth.admin.deleteUser(user2.id);
  await adminClient.auth.admin.deleteUser(user3.id);

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
