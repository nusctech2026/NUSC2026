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
const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function apiCall(endpoint, payload) {
  const url = `http://localhost:3000/api/integrations/ahibi/redemptions/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test_secret' },
    body: JSON.stringify(payload)
  });
  return { status: res.status, data: await res.json() };
}

async function testSessionBinding() {
  const ahibiEventId = 'evt_test_bind_' + Date.now();
  const { data: match } = await adminClient.from('matches').select('id').limit(1).single();
  const { data: benefit } = await adminClient.from('match_benefits').select('id').eq('match_id', match.id).limit(1).single();
  
  const email1 = `test_bind_1_${Date.now()}@example.com`;
  const email2 = `test_bind_2_${Date.now()}@example.com`;
  const { data: user1Data } = await adminClient.auth.admin.createUser({ email: email1, password: 'Password123!', email_confirm: true });
  const { data: user2Data } = await adminClient.auth.admin.createUser({ email: email2, password: 'Password123!', email_confirm: true });
  const user1 = user1Data.user;
  const user2 = user2Data.user;
  await adminClient.from('members').insert([
    { id: user1.id, first_name: 'Bind1', last_name: 'Test', email: email1, membership_number: 'NUSC-B1', status: 'active', membership_type: 'adult' },
    { id: user2.id, first_name: 'Bind2', last_name: 'Test', email: email2, membership_number: 'NUSC-B2', status: 'active', membership_type: 'adult' }
  ]);
  await adminClient.from('member_wallets').insert([
    { user_id: user1.id, available_points: 100 },
    { user_id: user2.id, available_points: 100 }
  ]);

  const user1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  await user1Client.auth.signInWithPassword({ email: email1, password: 'Password123!' });
  const user2Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  await user2Client.auth.signInWithPassword({ email: email2, password: 'Password123!' });

  const { data: r1, error: e1 } = await user1Client.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: benefit.id });
  const t1 = crypto.randomBytes(32).toString('hex');
  await adminClient.from('ticket_redemptions').update({ ahibi_event_id: ahibiEventId, token_hash: crypto.createHash('sha256').update(t1).digest('hex'), status: 'session_created' }).eq('id', r1);

  const { data: r2, error: e2 } = await user2Client.rpc('reserve_benefit_points', { p_match_id: match.id, p_benefit_id: benefit.id });
  const t2 = crypto.randomBytes(32).toString('hex');
  await adminClient.from('ticket_redemptions').update({ ahibi_event_id: ahibiEventId, token_hash: crypto.createHash('sha256').update(t2).digest('hex'), status: 'session_created' }).eq('id', r2);

  const sessionId = 'shared_session_' + Date.now();
  
  const [res1, res2] = await Promise.all([
    apiCall('validate', { authorization: t1, eventId: ahibiEventId, sessionId }),
    apiCall('validate', { authorization: t2, eventId: ahibiEventId, sessionId })
  ]);
  
  console.log("Validate R1:", res1);
  console.log("Validate R2:", res2);

  const { data: check } = await adminClient.from('ticket_redemptions').select('id, ahibi_session_id').in('id', [r1, r2]);
  console.log("DB State:", check);
  
  await adminClient.auth.admin.deleteUser(user1.id);
  await adminClient.auth.admin.deleteUser(user2.id);
}
testSessionBinding();
