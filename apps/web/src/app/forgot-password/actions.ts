'use server';

import { createServerClient } from '@nusc/db';

const confirmation = 'If an account exists for that email, we have sent a password reset link.';

function recoveryCallbackUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('Site URL is not configured');
  }
  const origin = new URL(configured || 'http://localhost:3000');
  if (origin.protocol !== 'https:' && !(
    process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(origin.hostname)
  )) {
    throw new Error('Site URL must use HTTPS');
  }
  return new URL('/auth/recovery', origin).toString();
}

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
