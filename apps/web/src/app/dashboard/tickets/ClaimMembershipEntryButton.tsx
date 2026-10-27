'use client';

import { useActionState } from 'react';
import { claimMembershipEntryAction } from './actions';

export function ClaimMembershipEntryButton({ fixtureId }: { fixtureId: string }) {
  const [state, action, pending] = useActionState(claimMembershipEntryAction, { error: '' });
  return (
    <form action={action}>
      <input type="hidden" name="fixtureId" value={fixtureId} />
      {state.error && <p role="alert" style={{ color: '#b91c1c', marginBottom: 8 }}>{state.error}</p>}
      <button type="submit" disabled={pending} style={{
        border: 0, borderRadius: 6, padding: '10px 16px', background: 'var(--navy-600)',
        color: '#fff', fontWeight: 600, cursor: pending ? 'wait' : 'pointer',
      }}>
        {pending ? 'Preparing booking…' : 'Book with Ahibi'}
      </button>
    </form>
  );
}
