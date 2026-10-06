import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
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
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore inside route handlers
            }
          },
        },
      }
    )

    // 1. Sign in with Supabase
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return NextResponse.json({ error: signInError.message }, { status: 401 })
    }

    // 2. Derive Identity from Server
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Failed to retrieve user' }, { status: 401 })
    }

    // 3. Verify Authorization
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
    
    if (rolesError || !rolesData || rolesData.length === 0) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Unauthorized: No valid roles' }, { status: 403 })
    }

    const validRoles = ['super_admin', 'store_manager', 'content_editor', 'support', 'fulfillment_staff']
    const hasAdminRole = rolesData.some(r => validRoles.includes(r.role))
    
    if (!hasAdminRole) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Unauthorized: Missing admin role' }, { status: 403 })
    }

    // 4. Sync Payload Projection
    const payload = await getPayload({ config: configPromise })
    
    const { docs } = await payload.find({
      collection: 'admins',
      where: {
        email: { equals: user.email },
      },
    })

    const displayRoles = rolesData.map(r => ({ role: r.role }))

    console.log("PAYLOAD CREATE DATA", {
      supabase_user_id: user.id,
      email: user.email,
      display_roles: displayRoles,
    });

    if (docs.length > 0) {
      await payload.update({
        collection: 'admins',
        id: docs[0].id,
        data: {
          supabase_user_id: user.id,
          email: user.email!,
          display_roles: displayRoles,
        },
      })
    } else {
      await payload.create({
        collection: 'admins',
        data: {
          supabase_user_id: user.id,
          email: user.email!,
          display_roles: displayRoles,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 })
  }
}
