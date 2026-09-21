import React from 'react';
import { createServerClient } from '@nusc/db';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Match Tickets | NUSC Membership',
};

export default async function TicketsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch member profile to get the membership number
  const { data: member } = await supabase
    .from('members')
    .select('membership_number')
    .eq('id', user.id)
    .single();

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        Match Tickets
      </h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>
        Access your member ticket benefits and priority seating.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>
          Ticketing Partner: Ahibi
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
          Your NUSC membership gives you priority access to match tickets and exclusive member discounts on Ahibi. 
          When booking tickets on the Ahibi platform, you will be prompted to enter your NUSC Membership Number.
        </p>
        
        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'inline-block' }}>
          <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            Your Membership Number
          </span>
          <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--red)' }}>
            {member?.membership_number}
          </span>
        </div>

        <div>
          <a href="#" style={{ 
            display: 'inline-block', 
            background: 'var(--navy-600)', 
            color: '#fff', 
            textDecoration: 'none', 
            padding: '12px 24px', 
            borderRadius: '6px', 
            fontWeight: 600 
          }}>
            Go to Ahibi Tickets
          </a>
        </div>
      </div>
    </div>
  );
}
