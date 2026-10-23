import { createServerClient } from '@nusc/db';
import { NextResponse } from 'next/server';
import { recoverySiteOrigin } from '../../forgot-password/recovery-url';

const safeRecoveryErrorCodes = new Set([
  'access_denied',
  'bad_code_verifier',
  'email_not_confirmed',
  'flow_state_not_found',
  'invalid_grant',
  'invalid_token',
  'otp_expired',
  'pkce_code_verifier_not_found',
  'token_expired',
]);

function safeRecoveryErrorCode(value: unknown) {
  if (typeof value !== 'string') return 'unknown';
  return safeRecoveryErrorCodes.has(value) ? value : 'other';
}

export async function GET(request: Request) {
  let siteOrigin: string;
  try {
    siteOrigin = recoverySiteOrigin();
  } catch {
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const incoming = new URL(request.url);
  const destination = new URL('/reset-password', siteOrigin);
  const code = incoming.searchParams.get('code');
  const flowId = incoming.searchParams.get('sb_flow_id') || undefined;
  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code, { flowId });
    if (!error) return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
    console.warn('[auth.recovery] code exchange failed', {
      errorCode: safeRecoveryErrorCode(error.code),
      status: typeof error.status === 'number' && Number.isInteger(error.status) ? error.status : null,
      hasFlowId: Boolean(flowId),
    });
  } else {
    console.warn('[auth.recovery] callback missing code', {
      errorCode: safeRecoveryErrorCode(incoming.searchParams.get('error_code')),
      hasProviderError: incoming.searchParams.has('error'),
      hasFlowId: Boolean(flowId),
    });
  }
  destination.searchParams.set('error', 'expired');
  return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
}
