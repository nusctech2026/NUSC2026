import { NextResponse } from 'next/server';
import { createAdminClient } from '@nusc/db';
import crypto from 'crypto';
import { verifyAhibiRequest, markEventProcessed, markEventFailed } from '../../utils';

export async function POST(req: Request) {
  const verifyResult = await verifyAhibiRequest(req);
  if (verifyResult.errorResponse) {
    return verifyResult.errorResponse;
  }
  
  const { payload, isIdempotentReplay, eventId: integrationEventId } = verifyResult;
  
  try {
    const { authorization: rawToken, eventId, sessionId } = payload;

    if (!rawToken || !eventId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const adminClient = createAdminClient();
    
    // Find redemption by token hash
    const { data: redemption, error } = await adminClient
      .from('ticket_redemptions')
      .select('*, match_benefits(discount_type, discount_value)')
      .eq('token_hash', tokenHash)
      .eq('ahibi_event_id', eventId)
      .single();

    if (error || !redemption) {
      if (integrationEventId) await markEventFailed(integrationEventId, 'invalid_token');
      return NextResponse.json({ valid: false, error: 'Invalid token or event' }, { status: 400 });
    }

    if (redemption.status !== 'reserved' && redemption.status !== 'session_created') {
      if (integrationEventId) await markEventFailed(integrationEventId, 'already_consumed');
      return NextResponse.json({ valid: false, error: 'Token already consumed' }, { status: 400 });
    }

    // Atomic conditional binding
    const { data: updatedRedemptions, error: updateError } = await adminClient
      .from('ticket_redemptions')
      .update({ 
        ahibi_session_id: sessionId,
        status: 'session_created',
        validated_at: new Date().toISOString()
      })
      .eq('id', redemption.id)
      .is('ahibi_session_id', null)
      .eq('status', 'reserved')
      .select('id');

    // Verify exactly 1 row was updated. If 0 rows updated, reload to check if idempotent retry or conflict
    if (updateError || !updatedRedemptions || updatedRedemptions.length === 0) {
      // Reload redemption to check state
      const { data: currentRedemption } = await adminClient
        .from('ticket_redemptions')
        .select('ahibi_session_id')
        .eq('id', redemption.id)
        .single();
        
      if (currentRedemption?.ahibi_session_id === sessionId) {
        // Idempotent retry: it was already bound to THIS session
        // Continue to success
      } else {
        // Conflict: it was bound to a DIFFERENT session or update failed
        if (integrationEventId) await markEventFailed(integrationEventId, 'conflict');
        return NextResponse.json({ valid: false, error: 'Token already bound to another session' }, { status: 409 });
      }
    }

    // Ensure we handle array or object return for joined table safely
    const benefit = Array.isArray(redemption.match_benefits) ? redemption.match_benefits[0] : redemption.match_benefits;

    if (integrationEventId) await markEventProcessed(integrationEventId);

    return NextResponse.json({
      valid: true,
      redemptionId: redemption.id,
      eventId: redemption.ahibi_event_id,
      discount: {
        type: benefit?.discount_type,
        value: benefit?.discount_value
      }
    });
  } catch (err) {
    console.error(err);
    if (verifyResult.eventId) await markEventFailed(verifyResult.eventId, 'internal_error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
