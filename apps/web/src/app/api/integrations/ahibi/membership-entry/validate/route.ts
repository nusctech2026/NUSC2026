import { NextResponse } from 'next/server';
import { createAdminClient } from '@nusc/db';
import crypto from 'crypto';
import { verifyAhibiRequest, markEventProcessed, markEventFailed } from '../../utils';

export async function POST(req: Request) {
  const verified = await verifyAhibiRequest(req, 'membership_entry_validate');
  if (verified.errorResponse) return verified.errorResponse;
  const { payload, eventId: integrationEventId } = verified;

  try {
    const { authorization, eventId, sessionId } = payload;
    if (typeof authorization !== 'string' || authorization.length < 30 || authorization.length > 200
        || typeof eventId !== 'string' || typeof sessionId !== 'string') {
      return NextResponse.json({ valid: false, error: 'Missing or invalid membership entry fields' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(authorization).digest('hex');
    const { data, error } = await createAdminClient().rpc('bind_membership_match_entry', {
      p_token_hash: tokenHash,
      p_ahibi_event_id: eventId,
      p_session_id: sessionId,
    });
    if (error || !data) {
      if (integrationEventId) await markEventFailed(integrationEventId, 'invalid_membership_entry');
      return NextResponse.json({ valid: false, error: 'Invalid, expired, or already used membership entry' }, { status: 400 });
    }
    if (integrationEventId) await markEventProcessed(integrationEventId);
    return NextResponse.json({
      valid: true,
      redemptionId: data.entry_id,
      eventId: data.event_id,
      entryType: data.entry_type,
      price: 0,
    });
  } catch (error) {
    console.error('Ahibi membership entry validation failed:', error);
    if (integrationEventId) await markEventFailed(integrationEventId, 'internal_error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
