import { NextResponse } from 'next/server';
import { createAdminClient } from '@nusc/db';
import { verifyAhibiRequest, markEventProcessed, markEventFailed } from '../../utils';

export async function POST(req: Request) {
  const verifyResult = await verifyAhibiRequest(req);
  if (verifyResult.errorResponse) {
    return verifyResult.errorResponse;
  }
  
  const { payload, isIdempotentReplay, eventId: integrationEventId } = verifyResult;

  if (isIdempotentReplay) {
    return NextResponse.json({ success: true, message: 'Already processed' });
  }

  try {
    const { redemptionId, sessionId, eventId } = payload;

    if (!redemptionId || !sessionId || !eventId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    
    // Verify redemption state and session binding
    const { data: redemption, error } = await adminClient
      .from('ticket_redemptions')
      .select('*')
      .eq('id', redemptionId)
      .eq('ahibi_session_id', sessionId)
      .eq('ahibi_event_id', eventId)
      .single();

    if (error || !redemption) {
      if (integrationEventId) await markEventFailed(integrationEventId, 'invalid_session');
      return NextResponse.json({ error: 'Invalid redemption, session, or event mismatch' }, { status: 400 });
    }

    if (redemption.status === 'released' || redemption.status === 'expired') {
      // Idempotency: already successfully processed
      if (integrationEventId) await markEventProcessed(integrationEventId);
      return NextResponse.json({ success: true, message: 'Already released' });
    }
    if (redemption.status !== 'session_created') {
      console.error("Failed endpoint: invalid status", redemption.status);
      if (integrationEventId) await markEventFailed(integrationEventId, 'invalid_status');
      return NextResponse.json({ error: 'Redemption is not in a valid state to be released' }, { status: 400 });
    }

    // Call RPC to release points
    const { error: rpcError } = await adminClient.rpc('release_benefit_points', {
      p_redemption_id: redemptionId
    });

    if (rpcError) {
      console.error("Failed endpoint: RPC error", rpcError);
      if (integrationEventId) await markEventFailed(integrationEventId, 'rpc_error');
      // DO NOT expose internal db errors
      return NextResponse.json({ error: 'Failed to release points' }, { status: 500 });
    }

    if (integrationEventId) await markEventProcessed(integrationEventId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    if (verifyResult.eventId) await markEventFailed(verifyResult.eventId, 'internal_error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
