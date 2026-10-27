import { createClient } from '@supabase/supabase-js';

/**
 * Create a privileged server client for modern Supabase secret API keys.
 * The key is sent as `apikey`; it is never used as a user Authorization JWT.
 */
export function createSupabaseSecretClient(supabaseUrl, secretKey, options = {}) {
  if (!supabaseUrl || !secretKey) {
    throw new Error('Missing Supabase server configuration.');
  }
  if (!secretKey.startsWith('sb_secret_')) {
    throw new Error('Expected a modern Supabase secret key.');
  }

  const apiKeyOnlyFetch = (input, init) => {
    const headers = new Headers(init?.headers);
    if (input instanceof Request) {
      input.headers.forEach((value, name) => {
        if (!headers.has(name)) headers.set(name, value);
      });
    }
    if (headers.get('Authorization')?.startsWith('Bearer sb_secret_')) {
      headers.delete('Authorization');
    }
    return globalThis.fetch(input, { ...init, headers });
  };

  return createClient(supabaseUrl, secretKey, {
    ...options,
    auth: { ...options.auth, autoRefreshToken: false, persistSession: false },
    global: { ...options.global, fetch: apiKeyOnlyFetch },
  });
}
