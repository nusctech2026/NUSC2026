'use server';

import { createHash, randomBytes } from 'crypto';
import { createAdminClient, createServerClient } from '@nusc/db';
import { redirect } from 'next/navigation';

export async function claimMembershipEntryAction(_previous: { error?: string }, formData: FormData) {
  const fixtureId = String(formData.get('fixtureId') || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fixtureId)) {
    return { error: 'Select a valid home match.' };
  }

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'Please sign in to use your membership entry.' };

  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const { data, error } = await createAdminClient().rpc('reserve_membership_match_entry', {
    p_user_id: user.id,
    p_fixture_id: fixtureId,
    p_token_hash: tokenHash,
  });

  if (error || !data) {
    console.error('Membership match entry reservation failed:', error?.message);
    return { error: error?.message || 'Unable to reserve this match entry. Please try again.' };
  }

  // The browser carries only the opaque one-time credential. Match, member, and
  // entry type are bound to its hash in the database and returned to Ahibi by NUSC.
  const checkout = new URL('https://ahibi.in/nusc-membership-checkout');
  checkout.searchParams.set('r', rawToken);
  redirect(checkout.toString());
}
