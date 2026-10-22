'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkMembershipPayment } from '@/app/membership/payment-actions';

export default function CheckPaymentButton() {
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function check() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await checkMembershipPayment();
      if (!result.success) throw new Error(result.error);
      if (result.status === 'paid' || result.status === 'already_processed') {
        setMessage('Payment confirmed. Your membership has been updated.');
      } else if (result.status === 'requires_manual_refund') {
        setMessage('Payment needs review. Please contact the club before paying again.');
      } else if (result.status === 'not_found') {
        setMessage('No unfinished payment found. Your dashboard has been refreshed.');
      } else {
        setMessage('Payment is not confirmed yet. If money was deducted, please wait and check again before paying.');
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to check your payment. Please try again shortly.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <div style={{ marginTop: 12 }}>
    <button type="button" onClick={() => void check()} disabled={busy}>
      {busy ? 'Checking payment…' : 'Check payment status'}
    </button>
    {message && <p role="status" style={{ marginTop: 8 }}>{message}</p>}
  </div>;
}
