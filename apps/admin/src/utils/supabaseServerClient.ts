import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase Service Role credentials');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignore in Server Actions
          }
        },
      },
    }
  );
}

export interface AuthenticatedStaff {
  userId: string;
  email: string;
  roles: string[];
}

/**
 * Server-side authorization guard.
 * Validates session from cookies and retrieves verified roles from public.user_roles.
 * Throws an error or returns null if caller is unauthenticated or unauthorized.
 */
export async function assertStaffRole(allowedRoles: string[]): Promise<AuthenticatedStaff> {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Authentication required. Please log into the Admin portal.');
  }

  const adminClient = getSupabaseAdminClient();
  const { data: rolesData, error: rolesError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (rolesError || !rolesData || rolesData.length === 0) {
    throw new Error('Access denied: No administrative roles found for this account.');
  }

  const userRoles = rolesData.map((r: any) => r.role);
  const isSuperAdmin = userRoles.includes('super_admin');
  const hasAllowedRole = isSuperAdmin || userRoles.some((r: string) => allowedRoles.includes(r));

  if (!hasAllowedRole) {
    throw new Error(`Access denied: Required roles: [${allowedRoles.join(', ')}].`);
  }

  return {
    userId: user.id,
    email: user.email || 'staff@nusc.club',
    roles: userRoles,
  };
}
