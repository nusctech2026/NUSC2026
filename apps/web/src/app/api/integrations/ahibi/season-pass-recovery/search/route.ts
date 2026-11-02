import { NextResponse } from 'next/server';
import { searchAhibiSeasonPassRecovery, AhibiSeasonPassRecoveryError } from '@nusc/membership/src/ahibi-season-pass-recovery';
import { markEventFailed, markEventProcessed, verifyAhibiRequest } from '../../utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const verified = await verifyAhibiRequest(req, 'season_pass_recovery_search');
  if (verified.errorResponse) return verified.errorResponse;
  try {
    const payload = verified.payload as Record<string, unknown>;
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      throw new AhibiSeasonPassRecoveryError(400, 'INVALID_RECOVERY_SEARCH');
    }
    const data = await searchAhibiSeasonPassRecovery(payload.query);
    if (verified.eventId) await markEventProcessed(verified.eventId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const code = error instanceof AhibiSeasonPassRecoveryError ? error.code : 'RECOVERY_SEARCH_FAILED';
    if (verified.eventId) await markEventFailed(verified.eventId, code);
    const status = error instanceof AhibiSeasonPassRecoveryError ? error.status : 503;
    return NextResponse.json({ success: false, code, message: 'Unable to search RISE season pass records.' }, { status });
  }
}
