import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@nusc/db';

export async function POST(req: Request) {
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';

    if (!signature) {
        return new Response('Missing signature', { status: 400 });
    }

    // 1. Generate expected signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature);
    const signatureBuffer = Buffer.from(signature);

    // Guard against length mismatch to prevent timingSafeEqual RangeError
    if (expectedBuffer.length !== signatureBuffer.length) {
        return new Response('Invalid signature', { status: 400 });
    }

    // 2. Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    if (!isValid) {
        return new Response('Invalid signature', { status: 400 });
    }

    let event: any;
    try {
        event = JSON.parse(rawBody);
    } catch {
        return new Response('Invalid JSON payload', { status: 400 });
    }

    // 3. Safe idempotent processing
    if (event.event === 'payment.captured') {
        const payment = event.payload?.payment?.entity;
        if (!payment) {
            return new Response('Missing payment entity', { status: 400 });
        }

        // Strict payment entity validations
        const paymentId = payment.id;
        const orderId = payment.order_id;
        const amount = payment.amount;
        const currency = payment.currency;
        const { userId, type } = payment.notes || {};

        // 3a. Validate payment ID format
        if (!paymentId || typeof paymentId !== 'string' || !paymentId.startsWith('pay_')) {
            return new Response('Invalid payment ID format', { status: 400 });
        }

        // 3b. Validate order ID format
        if (!orderId || typeof orderId !== 'string' || !orderId.startsWith('order_')) {
            return new Response('Invalid order ID format', { status: 400 });
        }

        // 3c. Validate amount (₹10 = 1000 paise)
        if (amount !== 1000) {
            return new Response(`Invalid payment amount: expected 1000 paise, got ${amount}`, { status: 400 });
        }

        // 3d. Validate currency
        if (currency !== 'INR') {
            return new Response(`Invalid payment currency: expected INR, got ${currency}`, { status: 400 });
        }

        // 3e. Validate registration fee context and member binding
        if (type !== 'registration_fee' || !userId) {
            return new Response('Irrelevant or unbound payment notes', { status: 400 });
        }

        const adminSupabase = createAdminClient();

        // 3f. Verify associated member exists in database
        const { data: member, error: memberFetchError } = await adminSupabase
            .from('members')
            .select('id, user_id, status, registration_payment_status')
            .eq('user_id', userId)
            .single();

        if (memberFetchError || !member) {
            console.error('Member not found for payment activation:', userId, memberFetchError);
            return new Response('Associated member not found', { status: 404 });
        }

        // Idempotency check: if already paid, return 200 without duplicate action
        if (member.registration_payment_status === 'paid') {
            return new Response(JSON.stringify({ status: 'already_processed', member_id: member.id }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Atomic update only if registration_payment_status is pending
        const { error: updateError } = await adminSupabase
            .from('members')
            .update({
                status: 'active',
                registration_payment_status: 'paid',
                registration_payment_id: paymentId,
            })
            .eq('user_id', userId)
            .eq('registration_payment_status', 'pending');

        if (updateError) {
            console.error('Failed to update member payment status:', updateError);
            return new Response('Database error', { status: 500 });
        }

        return new Response(JSON.stringify({ status: 'activated', member_id: member.id }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (event.event === 'payment.failed') {
        const payment = event.payload?.payment?.entity;
        const { userId, type } = payment?.notes || {};

        if (type === 'registration_fee' && userId) {
            const adminSupabase = createAdminClient();
            // Verify member: never downgrade or disrupt if already active/paid!
            const { data: member } = await adminSupabase
                .from('members')
                .select('status, registration_payment_status')
                .eq('user_id', userId)
                .single();

            if (member && member.registration_payment_status === 'paid') {
                // Ignore failure event if user already has paid status
                return new Response(JSON.stringify({ status: 'ignored_already_paid' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        return new Response(JSON.stringify({ status: 'failed_acknowledged' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response('OK', { status: 200 });
}

