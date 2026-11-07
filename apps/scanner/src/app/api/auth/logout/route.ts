import { createScannerSupabaseClient } from '@/lib/supabase/server'
import { isSameOriginRequest, scannerJson } from '@/lib/http'

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return scannerJson({ error: 'Request origin could not be verified.', code: 'ORIGIN_DENIED' }, 403)
  }

  try {
    const supabase = await createScannerSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      return scannerJson({ error: 'Sign out could not be completed. Try again.', code: 'SIGN_OUT_FAILED' }, 503)
    }
    return scannerJson({ success: true })
  } catch {
    return scannerJson({ error: 'Sign out could not be completed. Try again.', code: 'SIGN_OUT_FAILED' }, 503)
  }
}
