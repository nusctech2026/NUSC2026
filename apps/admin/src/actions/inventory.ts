'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from './audit'

function getSupabase() {
  return async () => {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
        },
      }
    )
  }
}

export async function adjustInventory(variantId: string, delta: number, reason: string) {
  const getClient = getSupabase()
  const supabase = await getClient()

  // 1. Get current admin identity
  const { data: claimsData } = await supabase.auth.getClaims()
  const adminId = claimsData?.claims?.sub
  if (!adminId) {
    throw new Error('Unauthorized')
  }

  // 2. Call transactional RPC
  const { data, error } = await supabase.rpc('adjust_inventory', {
    p_variant_id: variantId,
    p_delta: delta,
    p_reason: reason,
    p_admin_id: adminId
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
