import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from './service';

export const metadata = {
  title: 'Dashboard Overview | NUSC Membership',
};

export default async function DashboardPage() {
  let dashboardData;
  try {
    dashboardData = await getDashboardData();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      redirect('/login');
    }
    return <div>Error loading dashboard data.</div>;
  }

  const { profile, membership, availablePlans } = dashboardData;

  const currentPlanPrice = membership ? membership.plan.price : 0;
  
  // Filter plans to show only those that are upgrades (price > current plan price)
  // and exclude the base ₹1 tier (price 100) since that is collected at signup
  const availableUpgrades = availablePlans.filter(p => p.price > currentPlanPrice && p.price > 100);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        Welcome back, {profile.first_name || profile.email}!
      </h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>
        Manage your NUSC digital membership and discover upgrades.
      </p>

      {/* Membership Card */}
      {membership ? (
        <div style={{ 
          background: 'linear-gradient(135deg, var(--navy-600), var(--navy-800))', 
          borderRadius: '16px', 
          padding: '40px', 
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />
          
          <div className="member-card-header" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <p style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.85rem', opacity: 0.8, marginBottom: '8px' }}>
                Membership Tier
              </p>
              <p className="member-card-number" style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, lineHeight: 1 }}>
                {membership.plan.name}
              </p>
            </div>
          </div>

          <div className="member-card-stats" style={{ position: 'relative', zIndex: 10, marginTop: '30px', display: 'flex', gap: '40px' }}>
            <div>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Member Name</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{profile.first_name} {profile.last_name}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Status</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{membership.status}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Valid Since</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                {new Date(membership.start_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px' }}>No Active Membership</h3>
          <p style={{ color: '#64748b' }}>You are not currently a member. Please choose a plan below to unlock benefits.</p>
        </div>
      )}
      
      {/* Upgrades Section */}
      <div style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', color: '#0f172a' }}>
          {membership ? 'Available Upgrades' : 'Choose a Membership Plan'}
        </h2>
        
        {availableUpgrades.length === 0 ? (
          <p style={{ color: '#64748b' }}>You are currently on the highest tier. Thank you for your incredible support!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {availableUpgrades.map(plan => (
              <div key={plan.id} style={{ 
                background: '#fff', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>{plan.name}</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb', margin: '12px 0' }}>
                  ₹{(plan.price / 100).toLocaleString()}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px', flexGrow: 1 }}>
                  {plan.description || 'Premium access and exclusive benefits.'}
                </p>
                
                {plan.is_purchasable_online ? (
                  <button style={{
                    width: '100%',
                    padding: '12px',
                    background: 'var(--navy-600)',
                    color: '#fff',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}>
                    {membership ? 'Upgrade Now' : 'Join Now'}
                  </button>
                ) : (
                  <button style={{
                    width: '100%',
                    padding: '12px',
                    background: '#f1f5f9',
                    color: '#475569',
                    borderRadius: '8px',
                    fontWeight: 600,
                    border: '1px solid #cbd5e1',
                    cursor: 'pointer'
                  }}>
                    Contact Us to Purchase
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="store-banner" style={{ marginTop: '40px', padding: '24px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div className="store-banner-content">
          <h3 className="store-banner-title" style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '8px' }}>Shop the Store</h3>
          <p className="store-banner-desc" style={{ color: '#64748b', marginBottom: '16px' }}>
            Active members get automatic discounts on official NUSC merchandise!
          </p>
        </div>
        <Link href="http://localhost:3001" style={{ display: 'inline-block', padding: '10px 20px', background: '#0f172a', color: '#fff', borderRadius: '6px', fontWeight: 500, textDecoration: 'none' }}>
          Go to Store
        </Link>
      </div>
    </div>
  );
}
