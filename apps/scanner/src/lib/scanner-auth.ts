import 'server-only'

import { createScannerSupabaseClient } from './supabase/server'

const scannerRoles = new Set(['campaign_manager', 'gate_staff'])

export type ScannerStaff = {
  userId: string
  email: string
}

export type ScannerAuthorization =
  | { status: 'authorized'; staff: ScannerStaff }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'unavailable' }

export async function getScannerAuthorization(): Promise<ScannerAuthorization> {
  try {
    const supabase = await createScannerSupabaseClient()
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
    const userId = claimsData?.claims?.sub

    if (claimsError || typeof userId !== 'string' || !userId) {
      return { status: 'unauthenticated' }
    }

    const [userResult, roleResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ])

    const { data: userData, error: userError } = userResult
    const { data: roleData, error: roleError } = roleResult
    const user = userData.user

    if (userError || !user || user.id !== userId) {
      return { status: 'unauthenticated' }
    }

    if (roleError) {
      return { status: 'unavailable' }
    }

    const roles = (roleData ?? [])
      .map((row) => row.role)
      .filter((role): role is string => typeof role === 'string')
    const allowed = roles.includes('super_admin') || roles.some((role) => scannerRoles.has(role))

    if (!allowed) {
      return { status: 'forbidden' }
    }

    return {
      status: 'authorized',
      staff: {
        userId: user.id,
        // The existing RPC stores staff attribution as text. A UUID fallback
        // preserves a unique audit identity for accounts without an email.
        email: user.email?.trim() || user.id,
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}
