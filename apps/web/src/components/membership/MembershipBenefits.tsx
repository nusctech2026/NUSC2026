import React from 'react';

export default function MembershipBenefits() {
  return (
    <section className="section" style={{ background: '#ffffff' }}>
      <div className="wrap">
        <h2 style={{ textAlign: 'center', marginBottom: '60px', fontSize: '2.5rem', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase', color: '#0f172a' }}>What You Get</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          
          <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '16px', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' }}>
              Match Ticket Benefits
            </h3>
            <p style={{ color: '#475569', lineHeight: '1.6' }}>
              Eligible members can access member ticket benefits, priority seating, and early booking through our ticketing partner, Ahibi.
            </p>
          </div>

          <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '16px', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' }}>
              Merchandise Offers
            </h3>
            <p style={{ color: '#475569', lineHeight: '1.6' }}>
              Access special member pricing and selected merchandise offers on official NUSC apparel and accessories.
            </p>
          </div>

          <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ color: '#0f172a', fontSize: '1.5rem', marginBottom: '16px', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' }}>
              Exclusive Updates
            </h3>
            <p style={{ color: '#475569', lineHeight: '1.6' }}>
              Receive members-only newsletters, behind-the-scenes content, and invitations to exclusive club events.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
