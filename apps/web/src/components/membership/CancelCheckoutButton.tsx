'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelPendingMembershipPayment } from '@/app/membership/payment-actions';

export default function CancelCheckoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function cancel() {
    setBusy(true);
    try {
      const result = await cancelPendingMembershipPayment();
      if (!result.success) throw new Error(result.error);
      setMessage(result.status === 'cancelled' ? 'Checkout cancelled. Choose another tier below.'
        : 'A payment was found. Refresh your membership before starting another checkout.');
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to cancel checkout.'); }
    finally { setBusy(false); }
  }
  return <div style={{ marginTop: 16 }}>
    <button type="button" disabled={busy} onClick={() => void cancel()} style={{ padding: '10px 0', background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>
      {busy ? 'Checking payment…' : 'Cancel unfinished checkout to choose another tier'}
    </button>
    <p style={{ fontSize: '.85rem' }}>If a payment is processing, wait for confirmation before changing tiers.</p>
    {message && <p role="status">{message}</p>}
  </div>;
}
