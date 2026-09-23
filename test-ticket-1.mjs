import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local (SUPABASE_SERVICE_ROLE_KEY needed)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log('--- Starting Ticket 1 Verification ---');

  // 1. Create a dummy user
  const email = `testuser_${Date.now()}@example.com`;
  console.log(`Creating dummy user: ${email}`);
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true,
  });

  if (authError || !authData.user) {
    console.error('Failed to create user:', authError);
    return;
  }
  const userId = authData.user.id;

  try {
    // 2. Setup member and wallet
    console.log('Creating member and wallet...');
    await supabase.from('members').insert([{
      id: userId,
      membership_number: `TST-${Date.now()}`,
      first_name: 'Test',
      last_name: 'User',
      email: email,
      phone: '1234567890',
      status: 'active'
    }]);

    const { data: walletData, error: walletError } = await supabase.from('member_wallets').insert([{
      user_id: userId,
      available_points: 100
    }]).select().single();

    if (walletError) throw walletError;

    // 3. Setup dummy match and benefit
    console.log('Creating dummy match and benefit...');
    const { data: matchData, error: matchError } = await supabase.from('matches').insert([{
      opponent: 'Test Opponent',
      match_date: new Date().toISOString(),
      venue: 'Test Venue',
      ahibi_event_id: `EVT-${Date.now()}`
    }]).select().single();

    if (matchError) throw matchError;

    const { data: benefitData, error: benefitError } = await supabase.from('match_benefits').insert([{
      match_id: matchData.id,
      name: '10% OFF',
      points_cost: 10,
      discount_type: 'percentage',
      discount_value: 10,
      claim_start: new Date().toISOString(),
      claim_end: new Date(Date.now() + 86400000).toISOString()
    }]).select().single();

    if (benefitError) throw benefitError;

    // 4. Test Atomic Reservation
    console.log('Testing atomic reservation of 10 points...');
    const { data: redemptionId, error: reserveError } = await supabase.rpc('reserve_benefit_points', {
      p_user_id: userId,
      p_match_id: matchData.id,
      p_benefit_id: benefitData.id,
      p_points_cost: 10,
      p_ahibi_event_id: matchData.ahibi_event_id
    });

    if (reserveError) throw reserveError;
    console.log(`Reservation successful! Redemption ID: ${redemptionId}`);

    // 5. Verify Wallet Balance
    console.log('Verifying wallet balance...');
    const { data: finalWallet } = await supabase.from('member_wallets').select('*').eq('id', walletData.id).single();
    console.log(`Available points: ${finalWallet.available_points} (Expected: 90)`);
    console.log(`Reserved points: ${finalWallet.reserved_points} (Expected: 10)`);
    
    if (finalWallet.available_points !== 90 || finalWallet.reserved_points !== 10) {
      console.error('❌ Wallet balances are incorrect!');
    } else {
      console.log('✅ Wallet balances are correct!');
    }

    // 6. Verify Ledger
    console.log('Verifying immutable ledger...');
    const { data: txs } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', walletData.id);
    if (txs && txs.length === 1 && txs[0].transaction_type === 'reserve' && txs[0].points === -10) {
      console.log('✅ Ledger transaction is correct!');
    } else {
      console.error('❌ Ledger transaction is incorrect or missing!');
    }

    // 7. Verify Unique Constraint
    console.log('Testing double-redemption prevention (should fail)...');
    const { error: doubleReserveError } = await supabase.rpc('reserve_benefit_points', {
      p_user_id: userId,
      p_match_id: matchData.id,
      p_benefit_id: benefitData.id,
      p_points_cost: 10,
      p_ahibi_event_id: matchData.ahibi_event_id
    });

    if (doubleReserveError) {
      console.log(`✅ Double redemption successfully blocked: ${doubleReserveError.message}`);
    } else {
      console.error('❌ Double redemption was incorrectly allowed!');
    }

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    console.log('Cleaning up dummy user...');
    await supabase.auth.admin.deleteUser(userId);
    console.log('--- Ticket 1 Verification Complete ---');
  }
}

runTests();
