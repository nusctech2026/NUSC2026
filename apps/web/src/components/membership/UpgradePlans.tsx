import PaymentButton from './PaymentButton';
import type { MembershipPlan } from '@/app/dashboard/service';

interface UpgradePlansProps {
  plans: MembershipPlan[];
  availableUpgradeIds: string[];
  currentPlanSlug: string | null;
  hasMembership: boolean;
  canPurchase: boolean;
}

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px', color: '#2563eb' }}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="#e0e7ff" />
    <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PremiumCheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px', color: '#1e40af' }}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="#1d4ed8" />
    <path d="M7.5 12L10.5 15L16.5 9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GoldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="#fef3c7" />
    <path d="M7.5 12L10.5 15L16.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GENERAL_FEATURES = [
  { title: 'Matchday Access', desc: 'One General entry to each of the 10 home matches', gold: false },
  { title: 'Digital Credential', desc: 'Digital membership card and welcome pack', gold: false },
  { title: 'Club Updates', desc: 'Members-only email or WhatsApp updates with club news, fixture reminders and player stories', gold: false },
  { title: 'Exclusive Content', desc: 'Access to selected members-only videos, interviews and training features', gold: false },
  { title: 'Merchandise Discount', desc: '5% discount on eligible official NUSC merchandise', gold: false },
  { title: 'Partner Offers', desc: 'Access to offers secured from NUSC partners', gold: false },
  { title: 'Club Events', desc: 'Invitations to register for selected club events, screenings and community activities', gold: false },
  { title: 'Birthday Recognition', desc: 'Birthday message from the club', gold: false },
  { title: 'Priority Renewal', desc: 'First opportunity to renew for the following season', gold: false },
];

const VipCheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: '2px', color: '#fbbf24' }}>
    <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" fill="#b45309" />
    <path d="M7.5 12L10.5 15L16.5 9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const VIP_FEATURES = [
  { title: 'Exclusive VIP Box', desc: 'Exclusive use of the allocated VIP box for the 10 home matches', gold: true },
  { title: 'Hospitality', desc: 'Hospitality and entry arrangements attached to that box', gold: true },
  { title: 'Group Memberships', desc: 'Seven named digital membership cards, seven scarves and a box welcome pack', gold: true },
  { title: 'Premium Benefits', desc: 'All eligible Premium content and merchandise benefits for the named members, plus occasional early viewing', gold: false },
  { title: 'Maximum Discount', desc: '15% discount on eligible official merchandise purchases by the lead member', gold: true },
  { title: 'First Access', desc: 'First access to merchandise launches and separately ticketed club events', gold: true },
  { title: 'Event Invitations', desc: 'Invitations for up to seven to selected club gatherings, subject to capacity', gold: false },
  { title: 'Private Experience', desc: 'One proposed private club experience during the season, such as a guided training-ground visit or meet-and-greet, subject to scheduling, player welfare and club approval', gold: true },
  { title: 'Public Acknowledgment', desc: 'Option to acknowledge the lead member or organisation in a members’ thank-you feature, with their consent', gold: false },
  { title: 'Box Renewal Priority', desc: 'First option to renew the same box for the following season', gold: false },
  { title: 'Partner Offers', desc: 'Enhanced partner offers where available', gold: false },
];

const PREMIUM_FEATURES = [
  { title: 'Matchday Access', desc: 'One Premium Gallery entry to each of the 10 home matches', gold: false },
  { title: 'Base Benefits', desc: 'All Rise General benefits', gold: false },
  { title: 'Physical Collectible', desc: 'NUSC scarf or equivalent physical welcome item', gold: true },
  { title: 'Elevated Discount', desc: '10% discount on eligible official merchandise', gold: false },
  { title: 'Early Access', desc: 'Early access to new merchandise collections', gold: false },
  { title: 'Extended Content', desc: 'Extended members-only content, such as longer player interviews and season diary features', gold: false },
  { title: 'Priority Registration', desc: 'Priority registration for club open days, screenings and selected community events', gold: false },
  { title: 'Priority Booking', desc: 'Priority booking window for separately ticketed NUSC events', gold: false },
  { title: 'Player Experiences', desc: 'Opportunity to enter draws for approved player meet-and-greets or training visits', gold: false },
  { title: 'Supporters’ Wall', desc: 'Premium member recognition on an optional digital supporters’ wall', gold: false },
  { title: 'Partner Offers', desc: 'Enhanced partner offers where available', gold: false },
];

export function TierBenefits({ plans }: { plans: MembershipPlan[] }) {
  const tierFeatures = plans.map(plan => ({
    plan,
    features: plan.slug === 'rise-vip-box' ? VIP_FEATURES
      : plan.slug === 'rise-premium' ? PREMIUM_FEATURES
        : plan.slug === 'rise-general' ? GENERAL_FEATURES : [],
  })).filter(tier => tier.features.length > 0);
  if (!tierFeatures.length) return null;
  return <details className="membership-benefits" open>
    <summary className="membership-benefits__summary">
      <span className="membership-benefits__heading">
        <span className="membership-benefits__eyebrow">Compare what each tier includes</span>
        <span className="membership-benefits__title">Perks &amp; benefits by tier</span>
      </span>
      <span className="membership-benefits__toggle">
        <span className="membership-benefits__show-label">View benefits</span>
        <span className="membership-benefits__hide-label">Hide benefits</span>
        <svg className="membership-benefits__chevron" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </summary>
    <div className="membership-benefits__columns">
      {tierFeatures.map(({ plan, features }) => (
        <section className={`membership-benefits__column membership-benefits__column--${plan.slug}`} key={plan.id} aria-label={`${plan.name} benefits`}>
          <h3>{plan.name}</h3>
          <ul className="membership-benefits__list">
            {features.map(feature => (
              <li className="membership-benefits__item" key={feature.title}>
                {plan.slug === 'rise-vip-box'
                  ? feature.gold ? <GoldIcon /> : <VipCheckIcon />
                  : plan.slug === 'rise-premium'
                    ? feature.gold ? <GoldIcon /> : <PremiumCheckIcon />
                    : <CheckIcon />}
                <span><strong>{feature.title}:</strong> {feature.desc}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </details>;
}

export default function UpgradePlans({ plans, availableUpgradeIds, currentPlanSlug, hasMembership, canPurchase }: UpgradePlansProps) {
  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Explore every Rise tier
        </p>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', lineHeight: 1.2 }}>
          ANNUAL MEMBERSHIP TIERS
        </h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Passionate support backed by tangible matchday privileges. Valid for one year from activation. The ₹10 registration fee is separate. Tier purchases are charged at the full listed price.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {plans.map(plan => {
          const isVip = plan.slug === 'rise-vip-box';
          const isPremium = plan.slug === 'rise-premium';
          const isGeneral = plan.slug === 'rise-general';
          const isCurrentTier = currentPlanSlug === plan.slug;
          const isAvailableUpgrade = availableUpgradeIds.includes(plan.id);
          const totalPayable = plan.price / 100;
          const shortDescription = isVip
            ? 'Private suite access for up to seven guests.'
            : isPremium
              ? 'Premium Gallery access · scarf included.'
              : 'Core supporter access.';

          return (
            <div key={plan.id} style={{
              background: isVip ? '#0a0a0a' : '#fff',
              border: isVip ? '2px solid #b45309' : (isPremium ? '2px solid #1d4ed8' : '1px solid #e2e8f0'),
              outline: isCurrentTier ? '3px solid rgba(37, 99, 235, 0.22)' : undefined,
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isVip ? '0 10px 15px -3px rgba(180, 83, 9, 0.2)' : (isPremium ? '0 10px 15px -3px rgba(29, 78, 216, 0.1)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'),
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Header section */}
              {isVip && (
                <div style={{ background: 'linear-gradient(90deg, #b45309, #d97706)', color: '#fff', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                    ULTIMATE • EXECUTIVE SUITE TIER
                  </div>
                  <span>BY INVITATION OR WAITLIST</span>
                </div>
              )}
              {isPremium && (
                <div style={{ background: '#1d4ed8', color: '#fff', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                    MOST VALUED • PRESTIGE GALLERY TIER
                  </div>
                  <span>LIMITED PASS ALLOTMENT</span>
                </div>
              )}

              <div style={{ padding: '14px 16px 0' }}>
                {isGeneral && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '100px' }}>CORE SUPPORTER</span>
                    <span>Pass Tier 2</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: isVip ? '#fff' : '#0f172a', textTransform: 'uppercase', margin: 0, lineHeight: 1.05 }}>{plan.name}</h3>
                  {isCurrentTier && <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 9px', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap' }}>CURRENT TIER</span>}
                  {isVip && (
                    <div style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, textAlign: 'center', border: '1px solid #b45309', whiteSpace: 'nowrap' }}>
                      ALL INCLUSIVE
                    </div>
                  )}
                  {isPremium && (
                    <div style={{ background: '#fef3c7', color: '#b45309', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      SCARF INCLUDED
                    </div>
                  )}
                </div>

                <p style={{ color: isVip ? '#a3a3a3' : '#64748b', fontSize: '0.8rem', lineHeight: 1.35, margin: '0 0 10px' }}>{shortDescription}</p>

                <div style={{ borderTop: isVip ? '1px solid #262626' : '1px solid #e2e8f0', borderBottom: isVip ? '1px solid #262626' : '1px solid #e2e8f0', padding: '10px 0', marginBottom: '10px' }}>
                  {isVip ? (
                    <p style={{ color: '#fbbf24', fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Call to book</p>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 7px' }}>
                      <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1 }}>&#8377;{totalPayable.toLocaleString('en-IN')}</span>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>total payable / year</span>
                    </div>
                  )}
                </div>

                <div style={{ background: isVip ? '#171717' : (isPremium ? '#1d4ed8' : '#f8fafc'), border: isVip ? '1px solid #b45309' : (isPremium ? 'none' : '1px solid #e2e8f0'), color: isVip ? '#fbbf24' : (isPremium ? '#fff' : '#0f172a'), padding: '9px 10px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, fontSize: '0.75rem', marginBottom: '12px' }}>
                  {isVip ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                  ) : (isPremium ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  ))}
                  {isVip
                    ? '1 reserved VIP box at each of the 10 home matches'
                    : `${isPremium ? 'Premium Gallery' : 'General'} entry at all 10 home matches`}
                </div>
              </div>

              {/* Footer action */}
              <div style={{ padding: '0 16px 14px', marginTop: 'auto' }}>
                {isCurrentTier ? <button type="button" className="membership-pay-button" disabled aria-label={`${plan.name} is your current tier`}>Current tier</button>
                  : isVip ? <div>
                  <a href="tel:+918837402472" className="membership-pay-button" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                    Call to book
                  </a>
                  <p style={{ color: '#d4d4d8', fontSize: '.78rem', lineHeight: 1.4, margin: '8px 0 0' }}>
                    <a href="tel:+918837402472" style={{ color: '#fbbf24' }}>Kaki · 8837402472</a>
                    {' · '}
                    <a href="tel:+917005727288" style={{ color: '#fbbf24' }}>Ahibi · 7005727288</a>
                  </p>
                </div> : !plan.is_purchasable_online ? <button
                  type="button"
                  className="membership-pay-button"
                  disabled
                  aria-label={`${plan.name} membership coming soon`}
                >Coming soon</button> : !isAvailableUpgrade ? <button type="button" className="membership-pay-button" disabled>{hasMembership ? 'Not available as an upgrade' : 'Unavailable'}</button> : <PaymentButton planId={plan.id} requiresGeneralZone={plan.slug === 'rise-general'} disabled={!canPurchase || !plan.is_purchasable_online}>
                  {hasMembership ? 'Upgrade to ' : 'Activate '}{plan.name}
                </PaymentButton>}
              </div>
            </div>
          );
        })}
      </div>
      <TierBenefits plans={plans} />
    </div>
  );
}
