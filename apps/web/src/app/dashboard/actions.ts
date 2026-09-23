'use server';

import { createServerClient, createAdminClient } from '@nusc/db';
import { redirect } from 'next/navigation';
import crypto from 'crypto';

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function redeemBenefitAction(matchId: string, benefitId: string) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 1. Call RPC to reserve points
  const { data: redemptionId, error: rpcError } = await supabase
    .rpc('reserve_benefit_points', {
      p_match_id: matchId,
      p_benefit_id: benefitId
    });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    throw new Error(`Failed to reserve points: ${rpcError.message}`);
  }

  // 2. Generate cryptographically secure token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // 3. Update redemption record with hash using admin client
  const adminClient = createAdminClient();
  
  // We also need the ahibi_event_id to return to the frontend for the redirect.
  // The RPC stored it in the redemption record. Let's fetch it as admin.
  const { data: redemptionRecord, error: fetchError } = await adminClient
    .from('ticket_redemptions')
    .select('ahibi_event_id')
    .eq('id', redemptionId)
    .single();

  if (fetchError || !redemptionRecord) {
    // If this fails, we have reserved points but failed to setup the token.
    // In a robust system, we should perhaps release them, but for now we throw.
    throw new Error('Failed to fetch redemption record for token binding');
  }

  const { error: updateError } = await adminClient
    .from('ticket_redemptions')
    .update({ 
      token_hash: tokenHash,
      status: 'session_created' // Update status indicating the session/token is ready
    })
    .eq('id', redemptionId);

  if (updateError) {
    throw new Error('Failed to bind secure token');
  }

  // Return the raw token and the ahibi event ID to the client
  return {
    success: true,
    token: token,
    ahibiEventId: redemptionRecord.ahibi_event_id
  };
}
