import { NextResponse } from 'next/server';
import { verifyAhibiRequest, markEventProcessed, markEventFailed } from '../utils';
import {
  cancelManualRiseSeasonPass,
  getManualRiseSeasonPassStatus,
  ManualRiseSeasonPassError,
  reserveManualRiseSeasonPass,
  searchRiseSeasonPassMembers,
  settleManualRiseSeasonPass,
} from '@nusc/membership/src/ahibi-manual-season-pass';

type Action = 'search' | 'reserve' | 'settle' | 'cancel' | 'status';

export async function handleManualRisePassRequest(req: Request, action: Action) {
  const verified = await verifyAhibiRequest(req, 'manual_season_pass_' + action);
  if (verified.errorResponse) return verified.errorResponse;
  const { payload, eventId } = verified;
  try {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ManualRiseSeasonPassError(400, 'INVALID_REQUEST');
    }
    if (action === 'reserve' && payload.requestId !== req.headers.get('x-ahibi-request-id')) {
      throw new ManualRiseSeasonPassError(400, 'REQUEST_ID_MISMATCH');
    }

    const adminReference = typeof payload.adminReference === 'string' ? payload.adminReference.trim().slice(0, 120) : '';
    let data: unknown;
    if (action === 'search') {
      data = await searchRiseSeasonPassMembers(payload.query);
    } else if (action === 'reserve') {
      data = await reserveManualRiseSeasonPass({
        requestId: String(payload.requestId || ''),
        memberNumber: String(payload.memberNumber || ''),
        passId: payload.passId as any,
        zone: payload.zone === null || payload.zone === undefined ? null : payload.zone as any,
        adminReference,
      });
    } else if (action === 'settle') {
      data = await settleManualRiseSeasonPass({
        orderId: String(payload.orderId || ''),
        settlementType: payload.settlementType as any,
        modeOfPayment: payload.modeOfPayment as any,
        paymentReference: typeof payload.paymentReference === 'string' ? payload.paymentReference : undefined,
        complimentaryReason: typeof payload.complimentaryReason === 'string' ? payload.complimentaryReason : undefined,
        adminReference,
      });
    } else if (action === 'cancel') {
      data = await cancelManualRiseSeasonPass({
        orderId: String(payload.orderId || ''),
        adminReference,
      });
    } else {
      data = await getManualRiseSeasonPassStatus({
        orderId: String(payload.orderId || ''),
        adminReference,
      });
    }

    if (eventId) await markEventProcessed(eventId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const code = error instanceof ManualRiseSeasonPassError
      ? error.code
      : 'MANUAL_SEASON_PASS_FAILED';
    if (eventId) await markEventFailed(eventId, code);
    const status = error instanceof ManualRiseSeasonPassError ? error.status : 500;
    return NextResponse.json({
      success: false,
      code,
      message: error instanceof ManualRiseSeasonPassError ? error.message : 'Unable to complete the RISE season pass request.',
    }, { status });
  }
}
