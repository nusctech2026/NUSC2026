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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anonClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function runTests() {
  const email1 = `test_rls_${Date.now()}@example.com`;
  const { data: user1Data } = await adminClient.auth.admin.createUser({ email: email1, password: 'Password123!', email_confirm: true });
  const user1 = user1Data.user;
  const user1Client = createClient(supabaseUrl, supabaseAnonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  await user1Client.auth.signInWithPassword({ email: email1, password: 'Password123!' });

  console.log("Testing service_role access:");
  let { data: srData, error: srError } = await adminClient.from('integration_events').select('*').limit(1);
  console.log("Service Role Select:", srError ? srError.message : "Success");

  console.log("\nTesting anon access:");
  let { data: anonData, error: anonError } = await anonClient.from('integration_events').select('*').limit(1);
  console.log("Anon Select Error:", anonError ? anonError.message : "None", "| Data:", anonData);
  let { data: anonInsertData, error: anonInsertError } = await anonClient.from('integration_events').insert({ provider: 'ahibi', event_type: 'redemption', external_request_id: 'test1', payload_hash: '123', status: 'processing' });
  console.log("Anon Insert Error:", anonInsertError ? anonInsertError.message : "None");
  let { data: anonUpdateData, error: anonUpdateError } = await anonClient.from('integration_events').update({ status: 'failed' }).eq('provider', 'ahibi');
  console.log("Anon Update Error:", anonUpdateError ? anonUpdateError.message : "None");
  let { data: anonDeleteData, error: anonDeleteError } = await anonClient.from('integration_events').delete().eq('provider', 'ahibi');
  console.log("Anon Delete Error:", anonDeleteError ? anonDeleteError.message : "None");

  console.log("\nTesting authenticated access:");
  let { data: authData, error: authError } = await user1Client.from('integration_events').select('*').limit(1);
  console.log("Auth Select Error:", authError ? authError.message : "None", "| Data:", authData);
  let { data: authInsertData, error: authInsertError } = await user1Client.from('integration_events').insert({ provider: 'ahibi', event_type: 'redemption', external_request_id: 'test2', payload_hash: '123', status: 'processing' });
  console.log("Auth Insert Error:", authInsertError ? authInsertError.message : "None");
  let { data: authUpdateData, error: authUpdateError } = await user1Client.from('integration_events').update({ status: 'failed' }).eq('provider', 'ahibi');
  console.log("Auth Update Error:", authUpdateError ? authUpdateError.message : "None");
  let { data: authDeleteData, error: authDeleteError } = await user1Client.from('integration_events').delete().eq('provider', 'ahibi');
  console.log("Auth Delete Error:", authDeleteError ? authDeleteError.message : "None");

  await adminClient.auth.admin.deleteUser(user1.id);
  
  // also get pg_class info if possible via rpc?
  // Not possible unless we have an rpc, but let's just see RLS behavior.
}

runTests().catch(console.error);
