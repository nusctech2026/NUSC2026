import React from 'react';
import { MembershipPlan } from '@/app/dashboard/service';

interface UpgradePlansProps {
  availableUpgrades: MembershipPlan[];
  hasMembership: boolean;
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
  { title: 'Group Memberships', desc: 'Seven named digital memberships and seven welcome items', gold: true },
  { title: 'Premium Benefits', desc: 'All eligible Premium content and merchandise benefits for the named members', gold: false },
  { title: 'Maximum Discount', desc: '15% discount on eligible official merchandise purchases by the lead member', gold: true },
  { title: 'First Access', desc: 'First access to merchandise launches and separately ticketed club events', gold: true },
  { title: 'Event Invitations', desc: 'Invitations for up to seven to selected club gatherings, subject to capacity', gold: false },
  { title: 'Private Experience', desc: 'One proposed private club experience during the season, such as a guided training-ground visit or meet-and-greet, subject to scheduling, player welfare and club approval', gold: true },
  { title: 'Public Acknowledgment', desc: 'Option to acknowledge the lead member or organisation in a members’ thank-you feature, with their consent', gold: false },
  { title: 'Box Renewal Priority', desc: 'First option to renew the same box for the following season', gold: false },
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
];

export default function UpgradePlans({ availableUpgrades, hasMembership }: UpgradePlansProps) {
  if (availableUpgrades.length === 0) {
    return (
      <div style={{ marginTop: '40px' }}>
        <p style={{ color: '#64748b' }}>You are currently on the highest tier. Thank you for your incredible support!</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <p style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Select Your Matchday Tier
        </p>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', lineHeight: 1.2 }}>
          2026/27 SEASON MEMBERSHIP PACKS
        </h2>
        <p style={{ color: '#64748b', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Passionate support backed by tangible matchday privileges. Annual subscription renewable each pre-season.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
        {availableUpgrades.map(plan => {
          const isVip = plan.name.toLowerCase().includes('vip');
          const isPremium = !isVip && plan.name.toLowerCase().includes('premium');
          const isGeneral = !isPremium && !isVip;
          const features = isVip ? VIP_FEATURES : (isPremium ? PREMIUM_FEATURES : GENERAL_FEATURES);

          return (
            <div key={plan.id} style={{
              background: isVip ? '#0a0a0a' : '#fff',
              border: isVip ? '2px solid #b45309' : (isPremium ? '2px solid #1d4ed8' : '1px solid #e2e8f0'),
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

              <div style={{ padding: '20px 20px 0' }}>
                {isGeneral && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', marginBottom: '16px' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '100px' }}>CORE SUPPORTER</span>
                    <span>Pass Tier 2</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: isVip ? '#fff' : '#0f172a', textTransform: 'uppercase', margin: 0 }}>{plan.name}</h3>
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

                <p style={{ color: isVip ? '#a3a3a3' : '#64748b', fontSize: '0.85rem', lineHeight: 1.4, marginBottom: '16px', minHeight: '38px' }}>
                  {isVip
                    ? "A season-long shared experience for a family, group of supporters or business. The membership covers one box admitting up to seven guests at each of the 10 home matches."
                    : (isPremium
                      ? "For a supporter who wants better seats and a closer connection."
                      : "The accessible way to belong to the club for the whole season.")}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: isVip ? '1px solid #262626' : '1px solid #e2e8f0', borderBottom: isVip ? '1px solid #262626' : '1px solid #e2e8f0', padding: '16px 0', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: isVip ? '#fbbf24' : '#1e3a8a', lineHeight: 1 }}>₹{(plan.price / 100).toLocaleString()}</span>
                      <span style={{ color: isVip ? '#a3a3a3' : '#64748b', fontWeight: 600, fontSize: '0.8rem' }}>/ season</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: isVip ? '#fbbf24' : '#1e3a8a', letterSpacing: '0.05em', marginTop: '6px' }}>
                      {isVip ? "10 MATCH EXEC SUITE + VIP PRIVILEGES" : (isPremium ? "10 MATCH PREMIUM + VIP PRIVILEGES" : "FULL SEASON 10 MATCH ACCESS")}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: isVip ? '#d4d4d8' : '#475569', fontSize: '0.75rem' }}>
                    {isVip || isPremium ? (
                      <>AT <span style={{color: isVip ? '#fbbf24' : 'inherit'}}>₹{((plan.price / 100) / 10).toLocaleString()} / Match</span></>
                    ) : (
                      <span style={{ color: '#2563eb' }}>₹{((plan.price / 100) / 10).toLocaleString()} / MATCH</span>
                    )}
                  </div>
                </div>

                <div style={{ background: isVip ? '#171717' : (isPremium ? '#1d4ed8' : '#f8fafc'), border: isVip ? '1px solid #b45309' : (isPremium ? 'none' : '1px solid #e2e8f0'), color: isVip ? '#fbbf24' : (isPremium ? '#fff' : '#0f172a'), padding: '12px', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, fontSize: '0.8rem', marginBottom: '20px' }}>
                  {isVip ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path></svg>
                  ) : (isPremium ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  ))}
                  {isVip
                    ? "Includes 1 VIP Box Reserved Entry to each home match"
                    : (isPremium
                      ? "Includes 1 Premium Gallery Entry to each home match"
                      : "Includes 1 General entry to each home match")}
                </div>
              </div>

              {/* Features list */}
              <div style={{ padding: '0 20px', flexGrow: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {features.map((feature, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      {isVip ? (
                        feature.gold ? <GoldIcon /> : <VipCheckIcon />
                      ) : (isPremium ? (
                        feature.gold ? <GoldIcon /> : <PremiumCheckIcon />
                      ) : (
                        <CheckIcon />
                      ))}
                      <div>
                        <h4 style={{ fontWeight: 700, color: isVip ? '#fff' : '#0f172a', fontSize: '0.85rem', marginBottom: '2px', lineHeight: 1.2 }}>{feature.title}</h4>
                        <p style={{ color: isVip ? '#a3a3a3' : '#64748b', fontSize: '0.75rem', lineHeight: 1.3, margin: 0 }}>{feature.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer action */}
              <div style={{ padding: '20px', marginTop: '16px' }}>
                <button style={{
                  width: '100%',
                  padding: '12px',
                  background: isVip ? 'linear-gradient(90deg, #b45309, #d97706)' : (isPremium ? '#1d4ed8' : '#0a0a0a'),
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: plan.is_purchasable_online ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '8px',
                  alignItems: 'center',
                  marginBottom: '8px',
                  boxShadow: isVip ? '0 4px 14px 0 rgba(180, 83, 9, 0.39)' : 'none',
                  borderRadius: '4px'
                }} disabled={!plan.is_purchasable_online}>
                  <span>{hasMembership ? 'UPGRADE ' : 'JOIN '} {plan.name.toUpperCase()}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
                </button>
                <div style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: isVip ? '#a3a3a3' : '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {isVip || isPremium ? "PHYSICAL BOX DELIVERY  •  PRIORITY SEATING" : "IMMEDIATE DIGITAL PASS ISSUE"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
