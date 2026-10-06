import React from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const CustomAdminView: React.FC<any> = async (props) => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{props.title || 'Store Module'}</h1>
      <p>This is a custom admin view interacting directly with Supabase via SSR.</p>
      <div style={{ background: '#f5f5f5', padding: '1rem', marginTop: '1rem', borderRadius: '8px' }}>
        <h3>Supabase Auth Status</h3>
        <pre>{JSON.stringify({ user: user?.id, email: user?.email }, null, 2)}</pre>
      </div>
    </div>
  )
}
