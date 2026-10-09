import crypto from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@nusc/db';

export async function POST(req: Request) {
    const rawBody = await req.text();
    const headersList = await headers();
    const signature = headersList.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'dummy_webhook_secret';

    if (!signature) return new Response('Missing signature', { status: 400 });

    // 1. Generate expected signature
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    // 2. Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
    );

    if (!isValid) return new Response('Invalid signature', { status: 400 });

    const event = JSON.parse(rawBody);

    // 3. Safe idempotent processing
    if (event.event === 'payment.captured') {
        const { userId, type } = event.payload.payment.entity.notes || {};
        if (type === 'registration_fee' && userId) {
            const adminSupabase = createAdminClient();
            
            // Update members.registration_payment_status to 'paid'
            // Handle duplicate webhook deliveries gracefully (skip if already 'paid' by checking where clause)
            const { error } = await adminSupabase
                .from('members')
                .update({
                    registration_payment_status: 'paid',
                    registration_payment_id: event.payload.payment.entity.id
                })
                .eq('user_id', userId)
                .eq('registration_payment_status', 'pending');

            if (error) {
                console.error('Failed to update member payment status:', error);
                return new Response('Database error', { status: 500 });
            }
        }
    }

    return new Response('OK', { status: 200 });
}
