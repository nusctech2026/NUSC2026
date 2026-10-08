import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // Omitting maxAge and expires creates a session cookie
        maxAge: undefined,
        expires: undefined,
      }
    }
  )
}
