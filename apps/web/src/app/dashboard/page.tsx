import React from 'react';
import Link from 'next/link';
import { createServerClient } from '@nusc/db';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Dashboard Overview | NUSC Membership',
};

export default async function DashboardPage() {
  const supabase = await createServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch member profile
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!member) {
    return <div>Error loading member data.</div>;
  }

  const startDate = new Date(member.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  const expiryDate = new Date(member.created_at);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  const endDate = expiryDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        Welcome back, {member.first_name}!
      </h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>
        Here is your NUSC digital membership card and status.
      </p>

      {/* Membership Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))', 
        borderRadius: '16px', 
        padding: '40px', 
        color: '#fff',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />
        
        <div className="member-card-header" style={{ position: 'relative', zIndex: 10, display: 'flex' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
              Membership Number
            </p>
            <p className="member-card-number" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, lineHeight: 1 }}>
              {member.membership_number}
            </p>
          </div>
          <div className="logo" style={{ width: '60px', height: '60px', background: 'var(--logo) center/contain no-repeat', opacity: 0.9 }}></div>
        </div>

        <div className="member-card-stats" style={{ position: 'relative', zIndex: 10 }}>
          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Member Name</p>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{member.first_name} {member.last_name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Status</p>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{member.status}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Type</p>
            <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{member.membership_type}</p>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '40px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Membership Details</h2>
        <div className="details-grid">
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Email</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{member.email}</p>
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Phone</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{member.phone}</p>
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>City / District</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{member.city_district}</p>
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Start Date</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{startDate}</p>
          </div>
          <div>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Valid Until</p>
            <p style={{ fontWeight: 500, color: '#1e293b' }}>{endDate}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Perks & Benefits</h2>
        <ul className="perks-list">
          <li className="perk-item">
            <div className="perk-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </div>
            <div>
              <div className="perk-title">10% Off Store Wide</div>
              <div className="perk-desc">Enjoy an exclusive member discount on all official merchandise.</div>
            </div>
          </li>
          <li className="perk-item">
            <div className="perk-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div>
              <div className="perk-title">Priority Event Access</div>
              <div className="perk-desc">Get early access to tickets for meet and greets, player events, and more.</div>
            </div>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#0f172a' }}>Recent Transactions</h2>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div className="timeline-date">{startDate}</div>
              <div className="timeline-title">Membership Registration (1 Year)</div>
              <div className="timeline-amount">£35.00</div>
            </div>
          </div>
          <div className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div className="timeline-date">Pending</div>
              <div className="timeline-title">Welcome Pack Sent</div>
              <div className="timeline-amount" style={{ color: '#64748b' }}>Included</div>
            </div>
          </div>
        </div>
      </div>

      <div className="store-banner">
        <div className="store-banner-content">
          <h3 className="store-banner-title">Shop the Store</h3>
          <p className="store-banner-desc">Connect your membership number to the NUSC store to automatically apply your 10% discount at checkout!</p>
        </div>
        <Link href="/dashboard/store" className="store-banner-btn">Go to Store</Link>
      </div>
    </div>
  );
}
