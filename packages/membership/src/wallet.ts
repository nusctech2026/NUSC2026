import { createAdminClient, createServerClient } from '@nusc/db';

/**
 * Service for handling Wallet and Redemption operations atomically using Database RPCs.
 */

export interface ReservePointsParams {
  userId: string;
  matchId: string;
  benefitId: string;
  pointsCost: number;
  ahibiEventId: string;
}

export async function reserveBenefitPoints(params: ReservePointsParams) {
  // Use admin client because these operations require bypassing RLS policies
  // Alternatively, the RPC is SECURITY DEFINER so an authenticated client can call it.
  const supabase = await createServerClient();

  const { data: redemptionId, error } = await supabase.rpc('reserve_benefit_points', {
    p_user_id: params.userId,
    p_match_id: params.matchId,
    p_benefit_id: params.benefitId,
    p_points_cost: params.pointsCost,
    p_ahibi_event_id: params.ahibiEventId,
  });

  if (error) {
    console.error('Error reserving benefit points:', error);
    throw new Error(`Reservation failed: ${error.message}`);
  }

  return redemptionId as string;
}

export async function releaseBenefitPoints(redemptionId: string) {
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.rpc('release_benefit_points', {
    p_redemption_id: redemptionId,
  });

  if (error) {
    console.error('Error releasing benefit points:', error);
    throw new Error(`Release failed: ${error.message}`);
  }

  return true;
}

export async function spendBenefitPoints(redemptionId: string, ahibiBookingId: string) {
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase.rpc('spend_benefit_points', {
    p_redemption_id: redemptionId,
    p_ahibi_booking_id: ahibiBookingId,
  });

  if (error) {
    console.error('Error spending benefit points:', error);
    throw new Error(`Spend failed: ${error.message}`);
  }

  return true;
}

/**
 * Retrieve the current wallet balance for a user.
 */
export async function getWalletBalance(userId: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('member_wallets')
    .select('available_points, reserved_points, spent_points')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch wallet balance: ${error.message}`);
  }

  // If no wallet exists yet (e.g. legacy user), treat as 0
  if (!data) {
    return {
      available_points: 0,
      reserved_points: 0,
      spent_points: 0,
    };
  }

  return data;
}
