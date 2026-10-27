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

function TierArtwork({ tier }: { tier: 'general' | 'premium' | 'vip' }) {
  return <div className={`membership-plan-card__art membership-plan-card__art--${tier}`} aria-hidden="true" />;
}

export function TierBenefits({ plans }: { plans: MembershipPlan[] }) {
  const tierFeatures = plans.map(plan => ({
    plan,
    features: plan.slug === 'rise-vip-box' ? VIP_FEATURES
      : plan.slug === 'rise-premium' ? PREMIUM_FEATURES
        : plan.slug === 'rise-general' ? GENERAL_FEATURES : [],
  })).filter(tier => tier.features.length > 0);
  if (!tierFeatures.length) return null;
  return <details className="membership-benefits">
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

      <div className="membership-plan-grid">
        {plans.map(plan => {
          const isVip = plan.slug === 'rise-vip-box';
          const isPremium = plan.slug === 'rise-premium';
          const isGeneral = plan.slug === 'rise-general';
          const isCurrentTier = currentPlanSlug === plan.slug;
          const isAvailableUpgrade = availableUpgradeIds.includes(plan.id);
          const totalPayable = plan.price / 100;
          const basePricePaise = Math.round(plan.price * 1000 / 1298);
          const sportsFundPaise = Math.round(basePricePaise / 10);
          const gstPaise = Math.round((basePricePaise + sportsFundPaise) * 18 / 100);
          const formatRupees = (paise: number) => `\u20B9${Math.round(paise / 100).toLocaleString('en-IN')}`;
          const shortDescription = isVip
            ? 'Private suite access for up to seven guests.'
            : isPremium
              ? 'Premium Gallery access · scarf included.'
              : 'Core supporter access.';

          return (
            <div key={plan.id} className={`membership-plan-card membership-plan-card--${isVip ? 'vip' : isPremium ? 'premium' : 'general'}${isCurrentTier ? ' membership-plan-card--current' : ''}`}>
              {/* Header section */}
              {isVip && (
                <div className="membership-plan-card__ribbon membership-plan-card__ribbon--vip">
                  <div className="membership-plan-card__ribbon-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                    ULTIMATE • EXECUTIVE SUITE TIER
                  </div>
                  <span>BY INVITATION OR WAITLIST</span>
                </div>
              )}
              {isPremium && (
                <div className="membership-plan-card__ribbon membership-plan-card__ribbon--premium">
                  <div className="membership-plan-card__ribbon-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                    MOST VALUED • PRESTIGE GALLERY TIER
                  </div>
                  <span>LIMITED PASS ALLOTMENT</span>
                </div>
              )}

              {isGeneral && <div className="membership-plan-card__ribbon membership-plan-card__ribbon--general"><span>CORE SUPPORTER</span><span>PASS TIER 2</span></div>}

              <div className="membership-plan-card__body">
                <div className={`membership-plan-card__hero membership-plan-card__hero--${isVip ? 'vip' : isPremium ? 'premium' : 'general'}`}>
                  <TierArtwork tier={isVip ? 'vip' : isPremium ? 'premium' : 'general'} />
                  <div className="membership-plan-card__hero-content">
                <div className="membership-plan-card__title-row">
                  <h3 className="membership-plan-card__title">{plan.name}</h3>
                  {isCurrentTier && <span className="membership-plan-card__current-badge">Current tier</span>}
                  {isVip && (
                    <div className="membership-plan-card__badge membership-plan-card__badge--gold">
                      ALL INCLUSIVE
                    </div>
                  )}
                  {isPremium && (
                    <div className="membership-plan-card__badge membership-plan-card__badge--gold">
                      SCARF INCLUDED
                    </div>
                  )}
                </div>

                <p className="membership-plan-card__description">{shortDescription}</p>
                  </div>
                </div>

                {isVip ? null : (isGeneral || isPremium) ? (
                  <div className={`membership-price-breakdown${isPremium ? ' membership-price-breakdown--premium' : ''}`}>
                    <div className="membership-price-breakdown__base">
                      <span>Base membership price</span>
                      <strong className="membership-price-breakdown__base-amount">{formatRupees(basePricePaise)}</strong>
                    </div>
                    <div className="membership-price-breakdown__fees">
                      <div className="membership-price-breakdown__fee">
                        <span className="membership-price-breakdown__fee-label"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3.2c-1.9-2.1-5.5-1.1-5.5 1.7 0 2.4 2.9 4.5 5.5 6.2 2.6-1.7 5.5-3.8 5.5-6.2 0-2.8-3.6-3.8-5.5-1.7Z"/><path d="M3 14.1h3.2l2.1-1.8a2 2 0 0 1 1.3-.5h4.1a1.7 1.7 0 1 1 0 3.4h-3.1m-7.6 4.1h8.1c.8 0 1.5-.2 2.1-.7l6.1-4.8a1.7 1.7 0 0 0-2.1-2.7l-4.7 3.3M3 13.9v5.4" /></svg>Sports Development Fund (10%)</span>
                        <strong>+ {formatRupees(sportsFundPaise)}</strong>
                      </div>
                      <div className="membership-price-breakdown__fee">
                        <span className="membership-price-breakdown__fee-label"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h7m-7 4h7" /></svg>GST (18%)</span>
                        <strong>+ {formatRupees(gstPaise)}</strong>
                      </div>
                    </div>
                    <div className="membership-price-breakdown__total">
                      <span><strong>Total payable</strong><small>Per year</small></span>
                      <strong>{formatRupees(plan.price)}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '10px 0', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px 7px' }}>
                      <span style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1e3a8a', lineHeight: 1 }}>&#8377;{totalPayable.toLocaleString('en-IN')}</span>
                      <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.75rem' }}>total payable / year</span>
                    </div>
                  </div>
                )}

                {!isVip && <div className="membership-plan-card__included">
                  <p className="membership-plan-card__included-label">What’s included</p>
                <div className={`membership-plan-card__access${isPremium ? ' membership-plan-card__access--premium' : ''}`}>
                  {isVip ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                  ) : (isPremium ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  ) : (
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3.5" y="5" width="17" height="16" rx="2"></rect><path d="M7.5 3v4M16.5 3v4M3.5 10h17M8 14h3m-3 3h6"></path></svg>
                  ))}
                  {`${isPremium ? 'Premium Gallery' : 'General'} entry at all 10 home matches`}
                </div>
                {isPremium && <div className="membership-plan-card__included-item"><span className="membership-plan-card__check" aria-hidden="true">✓</span><span>Official club scarf included</span></div>}
                </div>}
                {isVip && <ul className="membership-plan-card__vip-highlights">
                  <li><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m5-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm8-3h6m-3-3v6" /></svg><span>Private suite access for up to seven guests</span></li>
                  <li><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4" /></svg><span>Premium hospitality experience</span></li>
                  <li><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 3 7h7l-5.5 4.5 2 7L12 16.5 5.5 20.5l2-7L2 9h7z" /></svg><span>One reserved VIP box at each of the 10 home matches</span></li>
                  <li><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 2 9 5v10l-9 5-9-5V7zm-9 5 9 5 9-5m-9 5v10" /></svg><span>Seven digital memberships, scarves and welcome pack</span></li>
                </ul>}

              </div>

              {/* Footer action */}
              <div className="membership-plan-card__footer">
                {!isVip && isCurrentTier ? <button type="button" className="membership-pay-button" disabled aria-label={`${plan.name} is your current tier`}>Current tier</button>
                  : isVip ? <div>
                  <div className="membership-plan-card__contact">
                    <span className="membership-plan-card__contact-label">For VIP box availability call</span>
                    <div className="membership-plan-card__contact-numbers">
                      <span>8837402472</span>
                      <span aria-hidden="true">·</span>
                      <span>7005727288</span>
                    </div>
                  </div>
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
