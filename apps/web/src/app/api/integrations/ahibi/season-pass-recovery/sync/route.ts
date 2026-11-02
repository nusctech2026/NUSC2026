import { NextResponse } from 'next/server';
import { AhibiSeasonPassRecoveryError, syncAhibiSeasonPassRecovery } from '@nusc/membership/src/ahibi-season-pass-recovery';
import { markEventFailed, markEventProcessed, verifyAhibiRequest } from '../../utils';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const verified = await verifyAhibiRequest(req, 'season_pass_recovery_sync');
  if (verified.errorResponse) return verified.errorResponse;
  try {
    const payload = verified.payload as Record<string, unknown>;
    if (!payload || Array.isArray(payload) || typeof payload !== 'object'
      || payload.requestId !== req.headers.get('x-ahibi-request-id')) {
      throw new AhibiSeasonPassRecoveryError(400, 'INVALID_RECOVERY_REQUEST');
    }
    const data = await syncAhibiSeasonPassRecovery({
      orderId: payload.orderId,
      memberNumber: payload.memberNumber,
      kind: payload.kind,
      reservationId: payload.reservationId,
      tickets: payload.tickets,
      adminReference: payload.adminReference,
    });
    if (verified.eventId) await markEventProcessed(verified.eventId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const code = error instanceof AhibiSeasonPassRecoveryError ? error.code : 'RECOVERY_SYNC_FAILED';
    if (verified.eventId) await markEventFailed(verified.eventId, code);
    const status = error instanceof AhibiSeasonPassRecoveryError ? error.status : 503;
    return NextResponse.json({ success: false, code, message: 'Unable to synchronize RISE ticket references.' }, { status });
  }
}
