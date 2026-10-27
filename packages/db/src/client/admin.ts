import { createSupabaseSecretClient } from './secret-key-client.mjs';

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('The Supabase service-role client can only be used on the server.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  if (!supabaseKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY must be a Supabase secret key.');
  }

  // This privileged server client intentionally has no user session.
  return createSupabaseSecretClient(supabaseUrl, supabaseKey);
}
