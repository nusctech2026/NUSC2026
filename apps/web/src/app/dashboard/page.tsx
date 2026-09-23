import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from './service';
import { RedeemButton } from './RedeemButton';

export const metadata = {
  title: 'Dashboard Overview | NUSC Membership',
};

export default async function DashboardPage() {
  let dashboardData;
  try {
    dashboardData = await getDashboardData();
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      redirect('/login');
    }
    return <div>Error loading dashboard data.</div>;
  }

  const { member, wallet, upcomingMatches } = dashboardData;

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
        
        <div className="member-card-header" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
              Membership Number
            </p>
            <p className="member-card-number" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, lineHeight: 1 }}>
              {member.membership_number}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
              Available Points
            </p>
            <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, lineHeight: 1, fontSize: '2rem' }}>
              {wallet ? wallet.available_points : 0}
            </p>
          </div>
        </div>

        <div className="member-card-stats" style={{ position: 'relative', zIndex: 10, marginTop: '30px' }}>
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', color: '#0f172a' }}>Upcoming Matches & Tickets</h2>
        {upcomingMatches.length === 0 ? (
          <p style={{ color: '#64748b' }}>No upcoming matches scheduled at this time.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {upcomingMatches.map(({ match, benefits }) => (
              <div key={match.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{match.opponent}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      {new Date(match.match_date).toLocaleDateString('en-GB', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })} • {match.venue}
                    </p>
                  </div>
                  <div style={{ padding: '4px 12px', background: '#f1f5f9', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>
                    {match.status}
                  </div>
                </div>

                {benefits.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>Available Member Benefits</h4>
                    {benefits.map((benefit: any) => {
                      const isAvailable = benefit.claimState === 'available';
                      const hasSufficientPoints = wallet && wallet.available_points >= benefit.points_cost;
                      const canRedeem = isAvailable && hasSufficientPoints;
                      
                      let statusColor = '#64748b';
                      if (benefit.claimState === 'available') statusColor = '#10b981';
                      if (benefit.claimState === 'closed') statusColor = '#ef4444';
                      if (benefit.claimState === 'upcoming') statusColor = '#f59e0b';

                      return (
                        <div key={benefit.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{benefit.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              Cost: {benefit.points_cost} Points • Discount: {benefit.discount_type === 'percentage' ? `${benefit.discount_value}%` : `£${benefit.discount_value}`}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: statusColor, fontWeight: 500, marginTop: '4px' }}>
                              Status: {benefit.claimState.toUpperCase()}
                              {benefit.claimState === 'upcoming' && benefit.claim_start ? ` (Opens ${new Date(benefit.claim_start).toLocaleDateString('en-GB')})` : ''}
                            </div>
                          </div>
                          <RedeemButton 
                            matchId={match.id} 
                            benefitId={benefit.id} 
                            canRedeem={canRedeem} 
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No benefits defined for this match yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="store-banner" style={{ marginTop: '24px' }}>
        <div className="store-banner-content">
          <h3 className="store-banner-title">Shop the Store</h3>
          <p className="store-banner-desc">Connect your membership number to the NUSC store to automatically apply your 10% discount at checkout!</p>
        </div>
        <Link href="/dashboard/store" className="store-banner-btn">Go to Store</Link>
      </div>
    </div>
  );
}
