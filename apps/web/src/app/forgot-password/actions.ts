'use server';

import { createServerClient } from '@nusc/db';
import { recoveryCallbackUrl } from './recovery-url';

const confirmation = 'If an account exists for that email, we have sent a password reset link.';


export async function requestPasswordReset(formData: FormData) {
  const rawEmail = formData.get('email');
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  let redirectTo: string;
  try {
    redirectTo = recoveryCallbackUrl();
  } catch {
    return { error: 'Password recovery is temporarily unavailable. Please try again later.' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  // Keep account existence and per-account rate limits out of the public response.
  if (error) console.error('[auth.recovery] reset email request failed', { code: error.code || 'UNKNOWN' });
  return { success: confirmation };
}
