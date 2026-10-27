import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from './service';
import PaymentButton from '@/components/membership/PaymentButton';
import CancelCheckoutButton from '@/components/membership/CancelCheckoutButton';
import CheckPaymentButton from '@/components/membership/CheckPaymentButton';
import UpgradePlans from '@/components/membership/UpgradePlans';

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
  const pendingPlan = pendingPayment ? availablePlans.find(plan => plan.id === pendingPayment.plan_id) : undefined;
  const plansForDisplay = [...availablePlans];
  if (membership?.plan.slug.startsWith('rise-') && !plansForDisplay.some(plan => plan.id === membership.plan.id)) {
    plansForDisplay.push(membership.plan);
    plansForDisplay.sort((a, b) => a.price - b.price);
  }
  const membershipCardVariant = !registered
    ? 'registration'
    : membership?.plan.slug === 'rise-premium'
      ? 'premium'
      : membership?.plan.slug === 'rise-vip-box'
        ? 'vip'
        : 'general';
  const membershipStatus = !registered
    ? 'Pending registration payment'
    : membership?.status === 'cancelled'
      ? 'Cancelled'
      : !tierActive
        ? 'Expired'
        : membership?.plan.slug === 'registration'
          ? 'Registered · choose a tier below'
          : 'Active';
  const membershipEndDate = membership?.end_date
    ? new Date(membership.end_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
    : null;

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
        {pendingPayment.ahibi_zone && <p>Your General season pass zone is {pendingPayment.ahibi_zone} for all ten matches.</p>}
        {pendingPayment.ahibi_pass_status === 'held' && pendingPayment.ahibi_reservation_expires_at
          && new Date(pendingPayment.ahibi_reservation_expires_at) <= new Date()
          && <p role="status">The Ahibi ticket hold has expired. Cancel this checkout, then start a new one to reserve a fresh pass.</p>}
        <PaymentButton
          planId={pendingPayment.plan_id}
          requiresGeneralZone={pendingPayment.ahibi_pass_id === 'general-season' || pendingPlan?.slug === 'rise-general'}
          initialZone={pendingPayment.ahibi_zone}
          zoneLocked={Boolean(pendingPayment.ahibi_zone)}
        >Resume tier payment</PaymentButton>
        <CheckPaymentButton />
        <CancelCheckoutButton />
      </div>}
      {/* Membership Card */}
      {membership ? (
        <section className={`membership-summary membership-summary--${membershipCardVariant}`} aria-label="Your membership summary">
          {membershipCardVariant === 'premium' && (
            <div className="membership-summary__ribbon membership-summary__ribbon--premium">
              <span><span aria-hidden="true">★</span> Most valued · Prestige Gallery tier</span>
              <span>Limited pass allotment</span>
            </div>
          )}
          {membershipCardVariant === 'vip' && (
            <div className="membership-summary__ribbon membership-summary__ribbon--vip">
              <span>Ultimate · Executive suite tier</span>
              <span>By invitation or waitlist</span>
            </div>
          )}

          <div className="membership-summary__content">
            {(membershipCardVariant === 'general' || membershipCardVariant === 'registration' || membershipCardVariant === 'vip') && (
              <div className="membership-summary__meta">
                {membershipCardVariant === 'general' && <span className="membership-summary__pill">Core supporter</span>}
                {membershipCardVariant === 'registration' && <span className="membership-summary__pill">Registration</span>}
                {(membershipCardVariant === 'general' || membershipCardVariant === 'registration') && (
                  <span className="membership-summary__tier-note">Pass tier 2</span>
                )}
                {membershipCardVariant === 'vip' && <span className="membership-summary__pill membership-summary__pill--gold">All inclusive</span>}
              </div>
            )}

            <div className="membership-summary__heading-row">
              <div>
                <p className={`membership-summary__eyebrow${membershipCardVariant === 'premium' ? ' membership-summary__eyebrow--premium' : ''}`}>
                  Membership tier
                  {membershipCardVariant === 'premium' && <span className="membership-summary__included-badge">Scarf included</span>}
                </p>
                <h2 className="membership-summary__title">
                  {registered ? membership.plan.name : 'Registration pending'}
                </h2>
              </div>
              <span className={`membership-summary__status${tierActive ? ' is-active' : ''}`}>
                <span className="membership-summary__status-dot" aria-hidden="true" />
                {membershipStatus}
              </span>
            </div>

            <div className="membership-summary__rule" />

            <dl className="membership-summary__facts">
              <div className="membership-summary__fact">
                <dt>Member name</dt>
                <dd>{`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email}</dd>
              </div>
              <div className="membership-summary__fact">
                <dt>Member number</dt>
                <dd>{membership.membership_number}</dd>
              </div>
              {membershipEndDate && <div className="membership-summary__fact">
                <dt>Membership valid until</dt>
                <dd>{membershipEndDate}</dd>
              </div>}
            </dl>
          </div>
        </section>
      ) : (
        <div style={{ padding: '24px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px' }}>No Active Membership</h3>
          <p style={{ color: '#64748b' }}>You are not currently a member. Please choose a plan below to unlock benefits.</p>
        </div>
      )}
      
      {/* Upgrades Section */}
      <UpgradePlans 
        plans={plansForDisplay}
        availableUpgradeIds={availableUpgrades.map(plan => plan.id)}
        currentPlanSlug={tierActive && membership?.plan.slug.startsWith('rise-') ? membership.plan.slug : null}
        hasMembership={!!tierActive && membership?.plan.slug !== 'registration'}
        canPurchase={!!registered && membership?.status !== 'cancelled' && !pendingPayment}
      />

    </div>
  );
}
