import type { AuthStrategy, PayloadRequest } from 'payload'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const supabaseStrategy: AuthStrategy = {
  name: 'supabase',
  authenticate: async ({ headers, payload }) => {
    // Attempt to create a Supabase SSR client to read cookies correctly
    const cookieHeader = headers.get('cookie') || ''
    
    // We parse the cookies manually since PayloadRequest might not have standard Next.js cookie helpers
    const getCookie = (name: string) => {
      const match = cookieHeader.match(new RegExp('(^| )' + name + '=([^;]+)'))
      if (match) return match[2]
      return undefined
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return getCookie(name)
          },
          set(name: string, value: string, options: CookieOptions) {
            // we're only reading in the authenticate hook, so set/remove don't need to do anything here
          },
          remove(name: string, options: CookieOptions) {
          },
        },
      }
    )

    const { data: claimsData, error } = await supabase.auth.getClaims()

    if (error || !claimsData?.claims?.sub) {
      return { user: null }
    }
    
    const userId = claimsData.claims.sub

    // Now we must verify if this user has an admin role via direct DB query
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    
    if (rolesError || !rolesData || rolesData.length === 0) {
      return { user: null }
    }

    const validRoles = ['super_admin', 'store_manager', 'content_editor', 'support', 'fulfillment_staff']
    const hasAdminRole = rolesData.some(r => validRoles.includes(r.role))
    
    if (!hasAdminRole) {
      return { user: null }
    }

    // Now that they are authorized, fetch the internal Payload user
    // We map their supabase UUID to our `Admins` collection.
    const { docs } = await payload.find({
      collection: 'admins',
      where: {
        supabase_user_id: {
          equals: userId,
        },
      },
      limit: 1,
    })

    if (docs.length > 0) {
      return {
        user: {
          ...docs[0],
          collection: 'admins',
        },
      }
    }

    return { user: null }
  },
}
