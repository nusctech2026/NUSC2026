import { NextResponse } from 'next/server';
import { createAdminClient } from '@nusc/db';
import { verifyAhibiRequest, markEventProcessed, markEventFailed } from '../../utils';

export async function POST(req: Request) {
  const verified = await verifyAhibiRequest(req, 'membership_entry_failed');
  if (verified.errorResponse) return verified.errorResponse;
  const { payload, isIdempotentReplay, eventId: integrationEventId } = verified;
  if (isIdempotentReplay) return NextResponse.json({ success: true, message: 'Already processed' });

  try {
    const { redemptionId, sessionId, eventId } = payload;
    if (typeof redemptionId !== 'string' || typeof sessionId !== 'string' || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid booking fields' }, { status: 400 });
    }
    const { data, error } = await createAdminClient().rpc('release_membership_match_entry', {
      p_entry_id: redemptionId,
      p_ahibi_event_id: eventId,
      p_session_id: sessionId,
    });
    if (error || !data) {
      if (integrationEventId) await markEventFailed(integrationEventId, 'invalid_booking_failure');
      return NextResponse.json({ error: 'Membership entry could not be released' }, { status: 400 });
    }
    if (integrationEventId) await markEventProcessed(integrationEventId);
    return NextResponse.json({ success: true, status: data.status });
  } catch (error) {
    console.error('Ahibi membership entry release failed:', error);
    if (integrationEventId) await markEventFailed(integrationEventId, 'internal_error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
