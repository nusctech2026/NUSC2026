import { validPaymentSignature, settleCapturedPayment } from '@nusc/membership/src/payments';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response('Webhook is not configured', { status: 503 });
  const rawBody = await req.text();
  if (!validPaymentSignature(rawBody, req.headers.get('x-razorpay-signature'), secret)) {
    return new Response('Invalid signature', { status: 400 });
  }
  let event;
  try { event = JSON.parse(rawBody); } catch { return new Response('Invalid JSON payload', { status: 400 }); }
  if (event?.event !== 'payment.captured') return Response.json({ status: 'ignored' });
  const payment = event?.payload?.payment?.entity;
  if (!payment || typeof payment.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(payment.id)
    || typeof payment.order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(payment.order_id)
    || !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || typeof payment.currency !== 'string'
    || payment.status !== 'captured' || payment.captured !== true) {
    return new Response('Invalid captured payment', { status: 400 });
  }
  try { return Response.json(await settleCapturedPayment(payment)); }
  catch { return new Response('Payment processing failed; retry delivery', { status: 500 }); }
}
