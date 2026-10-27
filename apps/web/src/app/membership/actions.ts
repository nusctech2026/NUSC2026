'use server';

import { registerMember, type MembershipFormData } from '@nusc/membership';
import { createServerClient } from '@nusc/db';
import { createPerformanceTrace } from '@nusc/db/src/performance';

function classifyRegistrationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'Validation failed') return 'input_validation';
  if (message === 'Membership payments are temporarily paused. Please try again shortly.') return 'checkout_disabled';
  if (message === 'Payments are temporarily unavailable. Please try again later.') return 'payment_gateway_config';
  if (message === 'DUPLICATE_EMAIL') return 'duplicate_email';
  if (message === 'Could not find base membership plan') return 'registration_plan_missing';
  if (message.startsWith('Failed to create account:')) return 'auth_user_creation';
  if (message.startsWith('Failed to create member record:')) return 'member_creation_rpc';
  if (message.includes('Missing Supabase environment variables')) return 'supabase_server_config';
  return 'unexpected';
}

export async function submitMembership(data: MembershipFormData) {
  const trace = createPerformanceTrace('registration.membership');
  try {
    const member = await trace.measure('account_and_member_creation', () => registerMember(data));
    const session = await createServerClient();
    const { error } = await trace.measure('password_auth', () => session.auth.signInWithPassword({ email: data.email.trim().toLowerCase(), password: data.password }));
    return { success: true as const, member, signedIn: !error };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '';
    // Keep provider/database details and submitted member data out of logs and the response.
    console.error('[registration.membership] failed', { reason: classifyRegistrationFailure(error) });
    return { success: false as const, error: message === 'Membership payments are temporarily paused. Please try again shortly.'
      ? message : message === 'DUPLICATE_EMAIL'
      ? 'An account with this email already exists. Sign in to resume your membership payment.'
      : 'Unable to create your account. Please try again shortly.' };
  } finally { trace.finish(); }
}
