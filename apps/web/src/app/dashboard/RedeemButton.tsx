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
        // Redirect to Ahibi
        const ahibiUrl = `https://ahibi.in/nusc-checkout?r=${result.token}&eventId=${result.ahibiEventId}`;
        window.location.href = ahibiUrl;
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to redeem benefit');
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
