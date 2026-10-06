import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  oldData: any | null = null,
  newData: any | null = null
) {
  const cookieStore = await cookies()
  
  // 1. Get user identity using the standard ANON client (respects cookies)
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const { data: claimsData } = await authClient.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (!userId) {
    console.warn(`Attempted to log audit for ${action} without a valid user ID.`)
    return
  }

  // 2. Perform the insertion using the SERVICE_ROLE client to bypass RLS
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return [] },
      },
    }
  )

  const { error } = await serviceClient.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData,
    new_data: newData
  })

  if (error) {
    console.error(`Failed to write audit log for ${action}:`, error)
  }
}
