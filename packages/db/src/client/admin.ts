import { createClient } from '@supabase/supabase-js';
import { createSupabaseSecretClient } from './secret-key-client.mjs';

export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('The Supabase service-role client can only be used on the server.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || (!secretKey && !serviceRoleKey)) {
    throw new Error('Missing Supabase environment variables');
  }

  if (secretKey) {
    if (!secretKey.startsWith('sb_secret_')) {
      throw new Error('SUPABASE_SECRET_KEY must be a Supabase secret key.');
    }

    // Prefer the modern secret key while retaining legacy service-role deployments.
    return createSupabaseSecretClient(supabaseUrl, secretKey);
  }

  // Preserve the former createAdminClient auth-session behavior for legacy keys.
  return createClient(supabaseUrl, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
