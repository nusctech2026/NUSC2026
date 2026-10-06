'use client';

import React, { useState } from 'react';
import { redeemBenefitAction } from './actions';

export function RedeemButton({ matchId, benefitId, canRedeem }: { matchId: string, benefitId: string, canRedeem: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!canRedeem || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await redeemBenefitAction(matchId, benefitId);
      
      if (result.success) {
        // Redirect to Ahibi via POST form submission (STAGING URL UNTIL CONTRACT CONFIRMED)
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = process.env.NEXT_PUBLIC_AHIBI_CHECKOUT_URL || 'https://staging.ahibi.in/mock-nusc-checkout';
        
        const authInput = document.createElement('input');
        authInput.type = 'hidden';
        authInput.name = 'authorization';
        authInput.value = result.token;
        
        const eventInput = document.createElement('input');
        eventInput.type = 'hidden';
        eventInput.name = 'eventId';
        eventInput.value = result.ahibiEventId;
        
        form.appendChild(authInput);
        form.appendChild(eventInput);
        document.body.appendChild(form);
        form.submit();
        
        // Form submission happens immediately, but we can clean up transiently
        document.body.removeChild(form);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to redeem benefit');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
      <button 
        onClick={handleRedeem}
        disabled={!canRedeem || loading} 
        style={{ 
          padding: '8px 16px', 
          background: canRedeem ? 'var(--navy-600)' : '#cbd5e1', 
          color: canRedeem ? '#fff' : '#64748b', 
          border: 'none', 
          borderRadius: '6px', 
          fontWeight: 600,
          cursor: (!canRedeem || loading) ? 'not-allowed' : 'pointer',
          opacity: (!canRedeem || loading) ? 0.8 : 1,
          transition: 'all 0.2s'
        }}
      >
        {loading ? 'Processing...' : 'Redeem & Buy Ticket'}
      </button>
      {error && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</span>}
    </div>
  );
}
