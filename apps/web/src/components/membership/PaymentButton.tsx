'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { startMembershipPayment, verifyMembershipPayment } from '@/app/membership/payment-actions';
import type { PaymentCallback } from '@nusc/membership/src/payments';

type CheckoutOptions = {
  key: string; amount: number; currency: string; name: string; description: string; order_id: string;
  handler: (response: PaymentCallback) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => {
  open: () => void; on: (event: string, handler: () => void) => void;
} } }

let checkoutScript: Promise<void> | undefined;
async function loadCheckout() {
  if (window.Razorpay) return;
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    let settled = false;
    let timeout: number | undefined;
    const cleanup = () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      cleanup();
      checkoutScript = undefined;
      script.remove();
      reject(new Error('Checkout could not load. Please check your connection and retry.'));
    };
    timeout = window.setTimeout(fail, 15_000);
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  await checkoutScript;
}

export default function PaymentButton({ planId = null, children, autoStart = false, onConfirmed, disabled = false,
  requiresGeneralZone = false, initialZone = null, zoneLocked = false }: {
  planId?: string | null; children: React.ReactNode; autoStart?: boolean; onConfirmed?: () => void; disabled?: boolean;
  requiresGeneralZone?: boolean; initialZone?: string | null; zoneLocked?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [zone, setZone] = useState(initialZone || '');
  const opened = useRef(false);
  const inFlight = useRef(false);

  async function pay() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      await loadCheckout();
      const result = await startMembershipPayment(planId, requiresGeneralZone ? zone || null : null);
      if (!result.success) throw new Error(result.error);
      if (!window.Razorpay) throw new Error('Checkout is unavailable. Please retry.');
      let verifying = false;
      const checkout = new window.Razorpay({
        key: result.order.keyId, amount: result.order.amount, currency: result.order.currency,
        name: 'Nagaland United Sports Club', description: result.order.description, order_id: result.order.orderId,
        theme: { color: '#081936' },
        handler: async (response) => {
          verifying = true;
          setMessage('Confirming your payment…');
          try {
            const verified = await verifyMembershipPayment(response);
            if (!verified.success) throw new Error(verified.error);
            if (verified.status === 'paid' || verified.status === 'already_processed') {
              setMessage(verified.ticketStatus === 'issued'
                ? 'Payment confirmed. Your ten Ahibi tickets are ready in Match Tickets.'
                : verified.ticketStatus === 'refund_required'
                  ? 'Payment confirmed, but ticket allocation needs review. Please contact the club before paying again.'
                  : verified.ticketStatus === 'pending'
                    ? 'Payment confirmed. Your Ahibi tickets are being prepared; check Match Tickets shortly. Please do not pay again.'
                    : 'Payment confirmed.');
              onConfirmed?.();
            } else if (verified.status === 'requires_manual_refund') {
              setMessage('Payment needs review. Please contact the club before paying again.');
            } else {
              setMessage('Payment is awaiting confirmation. Refresh your dashboard shortly; please do not pay again.');
            }
            router.refresh();
          } catch (error) { setMessage(error instanceof Error ? error.message : 'Confirmation is pending. Refresh your dashboard shortly.'); }
          finally { inFlight.current = false; setBusy(false); }
        },
        modal: { ondismiss: () => {
          if (verifying) return;
          setMessage('Checkout closed. You can resume this payment here.');
          inFlight.current = false; setBusy(false);
        } },
      });
      checkout.on('payment.failed', () => setMessage('Payment failed. You can retry in checkout or close it and try later.'));
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to open checkout. Please retry.');
      inFlight.current = false; setBusy(false);
    }
  }

  useEffect(() => {
    if (autoStart && !opened.current) { opened.current = true; void pay(); }
    // Auto-open once after signup; subsequent attempts are explicit button clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return <div>
    {requiresGeneralZone && <label style={{ display: 'grid', gap: 6, marginBottom: 12, color: '#334155', fontWeight: 600 }}>
      General season pass seating zone
      <select
        value={zone}
        onChange={event => setZone(event.target.value)}
        disabled={busy || disabled || zoneLocked}
        required
        aria-label="Choose General season pass seating zone"
        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', color: '#0f172a', font: 'inherit' }}
      >
        <option value="">Select a zone</option>
        <option value="G-1">General 1 (G-1)</option>
        <option value="G-2">General 2 (G-2)</option>
        <option value="G-3">General 3 (G-3)</option>
        <option value="G-4">General 4 (G-4)</option>
        <option value="G-5">General 5 (G-5)</option>
      </select>
      {zoneLocked && <span style={{ color: '#64748b', fontSize: '.8rem', fontWeight: 400 }}>This zone is held for your pending checkout.</span>}
    </label>}
    <button type="button" onClick={() => void pay()} disabled={busy || disabled || (requiresGeneralZone && !zone)} className="membership-pay-button">
      {busy ? 'Processing…' : children}
    </button>
    {message && <p role="status" style={{ marginTop: 12, fontSize: '.9rem', lineHeight: 1.5 }}>{message}</p>}
  </div>;
}
