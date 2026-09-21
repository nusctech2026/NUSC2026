import React from 'react';

export default function MembershipHero() {
  return (
    <section className="hero" style={{ minHeight: '60svh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0f172a' }}>
      <div className="wrap hero-in" style={{ textAlign: 'center', padding: '150px 0 60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="hero-sub" style={{ marginBottom: '20px', textAlign: 'center', color: 'var(--red)' }}>NUSC EXCLUSIVE</div>
        <h1 style={{ marginBottom: '24px', fontSize: '4rem', fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase', fontFamily: '"Barlow Condensed", sans-serif', color: '#0f172a' }}>
          Become A<br />
          Member
        </h1>
        <p style={{ maxWidth: '600px', margin: '0 auto', color: '#475569', fontSize: '1.25rem', lineHeight: '1.6' }}>
          Join the Nagaland United Sports Club membership program to access exclusive benefits, priority ticketing, and special merchandise offers.
        </p>
      </div>
    </section>
  );
}
