import type { SupabaseClient } from '@supabase/supabase-js';

export declare function createSupabaseSecretClient(
  supabaseUrl: string,
  secretKey: string,
  options?: Record<string, any>
): SupabaseClient;
