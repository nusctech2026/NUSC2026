import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from './service';
import PaymentButton from '@/components/membership/PaymentButton';
import CancelCheckoutButton from '@/components/membership/CancelCheckoutButton';
import CheckPaymentButton from '@/components/membership/CheckPaymentButton';
import UpgradePlans, { TierBenefits } from '@/components/membership/UpgradePlans';

export const dynamic = 'force-dynamic';

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

  const { profile, membership, availablePlans, pendingPayment } = dashboardData;
  const registered = membership?.registration_payment_status === 'paid';
  const tierActive = registered && membership.status === 'active'
    && (!membership.end_date || new Date(membership.end_date) > new Date());
  const currentPlanPrice = tierActive ? membership.plan.price : 0;
  const availableUpgrades = availablePlans.filter(p => p.price > currentPlanPrice);

  return (
    <div>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
        Welcome back, {profile.first_name || profile.email}!
      </h1>
      <p style={{ color: '#64748b', marginBottom: '40px' }}>
        Manage your membership and choose your annual Rise tier.
      </p>

      {!membership && <p><Link href="/membership">Register as a member</Link> to get started.</p>}
      {membership && !registered && <div className="registration-payment-notice">
        <h2>Complete your ₹10 membership fee</h2>
        <p>Your account is saved. Pay the registration fee to activate a Rise tier. Tier fees are separate.</p>
        <PaymentButton>Pay ₹10 membership fee</PaymentButton>
        {pendingPayment?.purpose === 'registration' && <CheckPaymentButton />}
      </div>}
      {pendingPayment?.purpose === 'tier' && <div className="registration-payment-notice">
        <p>You have an unfinished tier payment. Resume it to continue.</p>
        <PaymentButton planId={pendingPayment.plan_id}>Resume tier payment</PaymentButton>
        <CheckPaymentButton />
        <CancelCheckoutButton />
      </div>}
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
                {registered ? membership.plan.name : 'Registration pending'}
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
              <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>{!registered ? 'Pending registration payment' : membership.status === 'cancelled' ? 'Cancelled' : !tierActive ? 'Expired' : membership.plan.slug === 'registration' ? 'Registered · choose a tier below' : 'Active'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Member Number</p>
              <p style={{ fontWeight: 600, fontSize: '1.1rem', textTransform: 'capitalize' }}>
                {membership.membership_number}
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
      
      {membership?.end_date && <p style={{ marginTop: 16 }}>Membership valid until {new Date(membership.end_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}.</p>}
      {tierActive && membership && <TierBenefits slug={membership.plan.slug} />}
      {/* Upgrades Section */}
      <UpgradePlans 
        availableUpgrades={availableUpgrades} 
        hasMembership={!!tierActive && membership?.plan.slug !== 'registration'}
        canPurchase={!!registered && membership?.status !== 'cancelled' && !pendingPayment}
      />

    </div>
  );
}
