import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@nusc/db';

export async function verifyAhibiRequest(req: Request) {
  const rawBody = await req.text();
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (e) {
    return { errorResponse: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }

  const timestamp = req.headers.get('x-ahibi-timestamp');
  const signature = req.headers.get('x-ahibi-signature');
  const requestId = req.headers.get('x-ahibi-request-id');

  if (!timestamp || !signature || !requestId) {
    return { errorResponse: NextResponse.json({ error: 'Missing security headers' }, { status: 401 }) };
  }

  // Verify timestamp within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(now - reqTime) > 300) {
    return { errorResponse: NextResponse.json({ error: 'Request expired' }, { status: 401 }) };
  }

  // Verify HMAC
  const secret = process.env.AHIBI_PARTNER_SECRET || 'test_secret';
  const canonicalPayload = `${timestamp}.${requestId}.${rawBody}`;
  const expectedSig = crypto.createHmac('sha256', secret).update(canonicalPayload).digest('hex');

  // Harden HMAC comparison
  let sigBuf, expectedSigBuf;
  try {
    sigBuf = Buffer.from(signature, 'hex');
    expectedSigBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedSigBuf.length) {
      return { errorResponse: NextResponse.json({ error: 'Invalid signature length' }, { status: 401 }) };
    }
    if (!crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
      return { errorResponse: NextResponse.json({ error: 'Invalid signature' }, { status: 401 }) };
    }
  } catch (err) {
    return { errorResponse: NextResponse.json({ error: 'Malformed signature' }, { status: 401 }) };
  }

  // Replay Protection Lifecycle
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
  const adminClient = createAdminClient();

  // Check integration_events
  const { data: event } = await adminClient
    .from('integration_events')
    .select('*')
    .eq('provider', 'ahibi')
    .eq('external_request_id', requestId)
    .single();

  if (event) {
    if (event.payload_hash !== payloadHash) {
      return { errorResponse: NextResponse.json({ error: 'Request ID reused with different payload' }, { status: 400 }) };
    }
    if (event.status === 'processed') {
      return { payload, isIdempotentReplay: true };
    }
    if (event.status === 'processing') {
      return { errorResponse: NextResponse.json({ error: 'Concurrent request processing' }, { status: 409 }) };
    }
    // If 'failed', we allow retry by updating it back to processing
    if (event.status === 'failed') {
      await adminClient
        .from('integration_events')
        .update({ status: 'processing', received_at: new Date().toISOString() })
        .eq('id', event.id);
      return { payload, isIdempotentReplay: false, eventId: event.id };
    }
  }

  // New event
  const { data: newEvent, error: insertError } = await adminClient
    .from('integration_events')
    .insert({
      provider: 'ahibi',
      event_type: 'redemption',
      external_request_id: requestId,
      payload_hash: payloadHash,
      status: 'processing'
    })
    .select('id')
    .single();

  if (insertError) {
    // If it's a unique constraint violation, it means another request inserted it concurrently.
    if (insertError.code === '23505') {
       return { errorResponse: NextResponse.json({ error: 'Concurrent request processing' }, { status: 409 }) };
    }
    console.error('Failed to insert integration event:', insertError);
    return { errorResponse: NextResponse.json({ error: 'Internal server error' }, { status: 500 }) };
  }

  return { payload, isIdempotentReplay: false, eventId: newEvent.id };
}

export async function markEventProcessed(eventId: string) {
  const adminClient = createAdminClient();
  await adminClient.from('integration_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', eventId);
}

export async function markEventFailed(eventId: string, errorCode: string) {
  const adminClient = createAdminClient();
  await adminClient.from('integration_events').update({ status: 'failed', error_code: errorCode }).eq('id', eventId);
}
