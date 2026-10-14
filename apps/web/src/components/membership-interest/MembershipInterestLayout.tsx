'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitMembershipInterest, MembershipInterestInput } from '@/app/membership-interest/actions';
import './membership-interest.css';

const DISTRICTS = [
  'Dimapur',
  'Kohima',
  'Mokokchung',
  'Chümoukedima',
  'Wokha',
  'Zunheboto',
  'Mon',
  'Phek',
  'Tuensang',
  'Longleng',
  'Kiphire',
  'Peren',
  'Noklak',
  'Niuland',
  'Tseminyu',
  'Shamator',
  'Outside Nagaland',
];

const TIERS = [
  { label: 'RISE General', value: 'rise_general' },
  { label: 'Rise Premium', value: 'rise_premium' },
  { label: 'Rise VIP Box', value: 'rise_vip_box' },
];

export default function MembershipInterestLayout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<MembershipInterestInput | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const firstName = (formData.get('firstName') as string) || '';
    const lastName = (formData.get('lastName') as string) || '';
    const email = (formData.get('email') as string) || '';
    const phone = (formData.get('phone') as string) || '';
    const dateOfBirth = (formData.get('dateOfBirth') as string) || '';
    const cityDistrict = (formData.get('cityDistrict') as string) || '';
    const interestedTier = (formData.get('interestedTier') as string) || 'rise_general';
    const termsAccepted = formData.get('termsAccepted') === 'on';
    const marketingConsent = formData.get('marketingConsent') === 'on';
    const notes = (formData.get('notes') as string) || '';

    // Validations
    if (!firstName.trim() || firstName.trim().length < 2) {
      setError('First name must be at least 2 characters.');
      return;
    }

    if (!lastName.trim() || lastName.trim().length < 2) {
      setError('Last name must be at least 2 characters.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!dateOfBirth) {
      setError('Please provide your date of birth.');
      return;
    }

    if (!cityDistrict) {
      setError('Please select or enter your city / district.');
      return;
    }

    if (!termsAccepted) {
      setError('You must agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setIsSubmitting(true);

    const inputData: MembershipInterestInput = {
      firstName,
      lastName,
      email,
      phone: cleanPhone,
      dateOfBirth,
      cityDistrict,
      interestedTier,
      termsAccepted,
      marketingConsent,
      notes,
    };

    const res = await submitMembershipInterest(inputData);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedData(inputData);
    } else {
      setError(res.error || 'Failed to submit your pre-registration. Please try again.');
    }
  };

  return (
    <div className="interest-split-wrapper">
      {/* LEFT PANE - BRANDING & BENEFITS */}
      <section className="interest-left-pane" aria-label="Membership Benefits Information">
        <div className="interest-hero-crest" aria-hidden="true" />

        {/* Brand Link */}
        <Link href="/" className="interest-brand-link">
          <span
            className="brand-mark"
            style={{
              width: '44px',
              height: '44px',
              display: 'block',
              background: 'var(--logo) center/contain no-repeat',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span
              style={{
                fontFamily: 'var(--font-barlow, "Barlow Condensed", sans-serif)',
                fontWeight: 800,
                fontSize: '1.3rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Nagaland United
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                letterSpacing: '0.22em',
                opacity: 0.75,
                textTransform: 'uppercase',
              }}
            >
              Sports Club
            </span>
          </div>
        </Link>

        {/* Benefit highlights */}
        <div className="interest-benefits-container">
          <div>
            <div className="interest-pill">Pre-Registration &middot; Season 2026</div>
            <h2 className="interest-headline" style={{ marginTop: '14px' }}>
              Membership <span>Pre-Registration</span>
            </h2>
            <p className="interest-subhead">
              Pre-register today to secure priority access, exclusive member privileges, and early launch invitations. No upfront fee required.
            </p>
          </div>

          {/* TIER 1: RISE General */}
          <div className="interest-tier-card">
            <div className="interest-tier-header">
              <h3 className="interest-tier-name">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                RISE General
              </h3>
              <span className="interest-tier-tag general">Standard Tier</span>
            </div>
            <ul className="interest-tier-perks">
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>10 Home Matches</strong> (General stadium admission)</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Digital membership credential &amp; welcome pack</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>5% discount</strong> on official NUSC apparel &amp; merchandise</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Members-only WhatsApp updates &amp; screening invitations</span>
              </li>
            </ul>
          </div>

          {/* TIER 2: Rise Premium */}
          <div className="interest-tier-card featured">
            <div className="interest-tier-header">
              <h3 className="interest-tier-name">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Rise Premium
              </h3>
              <span className="interest-tier-tag premium">Most Popular</span>
            </div>
            <ul className="interest-tier-perks">
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>10 Home Matches</strong> in Premium Gallery seating</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>Official NUSC Scarf</strong> or physical collectible item</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>10% merchandise discount</strong> &amp; early collection access</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Draw entries for player meet-and-greets &amp; open training visits</span>
              </li>
            </ul>
          </div>

          {/* TIER 3: Rise VIP Box */}
          <div className="interest-tier-card">
            <div className="interest-tier-header">
              <h3 className="interest-tier-name">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                </svg>
                Rise VIP Box
              </h3>
              <span className="interest-tier-tag vip">VIP Hospitality</span>
            </div>
            <ul className="interest-tier-perks">
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>Dedicated VIP Box</strong> for 10 Home Matches with matchday hospitality</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>7 named memberships</strong> + 7 official welcome collectible packs</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span><strong>15% maximum discount</strong> on official merchandise</span>
              </li>
              <li className="interest-tier-perk-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Exclusive private club experience (squad meet &amp; training tour)</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* RIGHT PANE - REGISTRATION FORM */}
      <section className="interest-right-pane" aria-label="Membership Pre-Registration Form">
        <div className="interest-form-inner">
          <Link href="/" className="interest-back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Home
          </Link>

          {submittedData ? (
            /* SUCCESS STATE */
            <div className="interest-success-card">
              <div className="interest-success-badge">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h2 className="interest-success-title">Pre-Registration Confirmed!</h2>
              <p className="interest-success-msg">
                Thank you, <strong>{submittedData.firstName} {submittedData.lastName}</strong>! Your details are successfully saved in the official NUSC pre-registration registry.
              </p>

              <div className="interest-summary-box">
                <div className="interest-summary-row">
                  <span className="interest-summary-label">Full Name</span>
                  <span className="interest-summary-val">{submittedData.firstName} {submittedData.lastName}</span>
                </div>
                <div className="interest-summary-row">
                  <span className="interest-summary-label">Mobile Number</span>
                  <span className="interest-summary-val">{submittedData.phone}</span>
                </div>
                <div className="interest-summary-row">
                  <span className="interest-summary-label">Email</span>
                  <span className="interest-summary-val">{submittedData.email}</span>
                </div>
                <div className="interest-summary-row">
                  <span className="interest-summary-label">Date of Birth</span>
                  <span className="interest-summary-val">{submittedData.dateOfBirth}</span>
                </div>
                <div className="interest-summary-row">
                  <span className="interest-summary-label">City / District</span>
                  <span className="interest-summary-val">{submittedData.cityDistrict}</span>
                </div>
                <div className="interest-summary-row">
                  <span className="interest-summary-label">Preferred Tier</span>
                  <span className="interest-summary-val">
                    {TIERS.find((t) => t.value === submittedData.interestedTier)?.label || submittedData.interestedTier}
                  </span>
                </div>
              </div>

              <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
                When official membership kits and payment portals go live, we will send an exclusive priority activation invite directly to your email and WhatsApp.
              </p>

              <div className="interest-success-actions">
                <Link href="/" className="interest-btn-primary">
                  Explore Club News &amp; Fixtures
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmittedData(null)}
                  className="interest-btn-secondary"
                >
                  Pre-Register Another Member
                </button>
              </div>
            </div>
          ) : (
            /* PRE-REGISTRATION FORM */
            <>
              <div>
                <h1 className="interest-title">
                  Pre-Register for <br />
                  <span className="interest-title-highlight">NUSC Membership</span>
                </h1>
                <div className="interest-title-bar" />
                <p className="interest-desc">
                  Be the first to join the club. Fill in your details below to pre-register your membership before public launch.
                </p>
              </div>

              {error && (
                <div className="interest-error-box" role="alert">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="interest-form" noValidate>
                {/* First Name & Last Name */}
                <div className="interest-row">
                  <div className="interest-group">
                    <label htmlFor="firstName">
                      First Name <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      placeholder="Enter your first name"
                      required
                      autoComplete="given-name"
                    />
                  </div>

                  <div className="interest-group">
                    <label htmlFor="lastName">
                      Last Name <span className="required-star">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      placeholder="Enter your last name"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Email & Mobile */}
                <div className="interest-row">
                  <div className="interest-group">
                    <label htmlFor="email">
                      Email Address <span className="required-star">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="interest-group">
                    <label htmlFor="phone">
                      Mobile / WhatsApp <span className="required-star">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="Enter 10-digit number"
                      required
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>
                </div>

                {/* Date of Birth & City/District */}
                <div className="interest-row">
                  <div className="interest-group">
                    <label htmlFor="dateOfBirth">
                      Date of Birth <span className="required-star">*</span>
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      required
                    />
                  </div>

                  <div className="interest-group">
                    <label htmlFor="cityDistrict">
                      City / District <span className="required-star">*</span>
                    </label>
                    <select id="cityDistrict" name="cityDistrict" defaultValue="" required>
                      <option value="" disabled>
                        Select your city / district...
                      </option>
                      {DISTRICTS.map((district) => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preferred Tier */}
                <div className="interest-group">
                  <label htmlFor="interestedTier">
                    Interested Membership Tier <span className="required-star">*</span>
                  </label>
                  <select id="interestedTier" name="interestedTier" defaultValue="rise_general">
                    {TIERS.map((tier) => (
                      <option key={tier.value} value={tier.value}>
                        {tier.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Suggestions / Notes */}
                <div className="interest-group">
                  <label htmlFor="notes">
                    Suggestions / Club Ideas (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={2}
                    placeholder="Tell us what merchandise, events, or membership benefits you'd like to see..."
                  />
                </div>

                {/* Terms and Consent Checkboxes matching actual membership */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  <label className="interest-checkbox-label">
                    <input type="checkbox" name="termsAccepted" required defaultChecked />
                    <span>
                      I agree with the <Link href="/terms" style={{ color: 'var(--navy-600, #132742)', fontWeight: 600 }}>Terms and Conditions</Link> and <Link href="/privacy-policy" style={{ color: 'var(--navy-600, #132742)', fontWeight: 600 }}>Privacy Policy</Link> of NUSC. <span className="required-star">*</span>
                    </span>
                  </label>

                  <label className="interest-checkbox-label">
                    <input type="checkbox" name="marketingConsent" defaultChecked />
                    <span>
                      Keep me updated via WhatsApp &amp; Email with official NUSC announcements, fixtures, and early member perks.
                    </span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="interest-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Pre-Registering...
                    </>
                  ) : (
                    <>
                      Pre-Register for Membership
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
