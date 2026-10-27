import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { hasOnlyCampaignRoles, isCampaignOnlyStaff, staffRoles } from '../../../../auth/staffRoles'
import { createPerformanceTrace } from '@nusc/db/src/performance'

export async function POST(request: Request) {
  const trace = createPerformanceTrace('admin.login')
  try {
    const parsedBody: unknown = await request.json().catch(() => null)
    if (!parsedBody || typeof parsedBody !== 'object') {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }
    const body = parsedBody as { email?: unknown; password?: unknown; portal?: unknown }
    const { email, password } = body
    const portal = body?.portal === 'campaign' ? 'campaign' : 'staff'
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 })
    }
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // Delete expiration properties to create a Session Cookie (expires when browser closes)
                delete options.maxAge;
                delete options.expires;
                cookieStore.set(name, value, options)
              })
    } catch {
              // Ignore inside route handlers
            }
          },
        },
      }
    )

    // 1. Sign in with Supabase
    const { data: signInData, error: signInError } = await trace.measure('password_auth', () => supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    }))

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 401 })
    }

    // The password exchange above returns the Auth server's verified identity.
    // Do not re-fetch it, and never substitute a browser-provided session/user.
    const user = signInData?.user

    if (!user) {
      return NextResponse.json({ error: 'Failed to retrieve user' }, { status: 401 })
    }

    // 3. Verify Authorization
    const { data: rolesData, error: rolesError } = await trace.measure('roles', () => supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id))
    
    if (rolesError || !rolesData || rolesData.length === 0) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Unauthorized: No valid roles' }, { status: 403 })
    }

    const validRoles = rolesData.map(r => r.role).filter((role): role is string => typeof role === 'string')
    const campaignOnly = isCampaignOnlyStaff({ roles: validRoles })
    const campaignPortalAllowed = hasOnlyCampaignRoles(validRoles)
    const hasAdminRole = validRoles.some(role => staffRoles.includes(role))
    
    if (!hasAdminRole) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Unauthorized: Missing admin role' }, { status: 403 })
    }

    if ((portal === 'campaign' && !campaignPortalAllowed) || (portal === 'staff' && campaignOnly)) {
      await supabase.auth.signOut()
      return NextResponse.json({
        error: portal === 'campaign'
          ? 'This sign-in is for campaign-only staff accounts.'
          : 'Use the Campaign Staff Login for this account.',
      }, { status: 403 })
    }

    // 4. Sync Payload Projection
    const payload = await trace.measure('payload_init', () => getPayload({ config: configPromise }))
    
    const { docs } = await trace.measure('projection_read', () => payload.find({
      collection: 'admins',
      where: {
        email: { equals: user.email },
      },
      limit: 1,
      depth: 0,
      pagination: false,
    }))

    const displayRoles = rolesData.map(r => ({ role: r.role }))

    if (docs.length > 0) {
      const existing = docs[0]
      const storedRoles = (existing.display_roles || []).map(item => item.role).sort()
      const currentRoles = rolesData.map(item => item.role).sort()
      const needsSync = existing.supabase_user_id !== user.id || existing.email !== user.email
        || JSON.stringify(storedRoles) !== JSON.stringify(currentRoles)
      if (needsSync) await trace.measure('projection_update', () => payload.update({
        collection: 'admins',
        id: docs[0].id,
        data: {
          supabase_user_id: user.id,
          email: user.email!,
          display_roles: displayRoles,
        },
      }))
    } else {
      await trace.measure('projection_create', () => payload.create({
        collection: 'admins',
        data: {
          supabase_user_id: user.id,
          email: user.email!,
          display_roles: displayRoles,
        },
      }))
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 })
  } finally { trace.finish() }
}
