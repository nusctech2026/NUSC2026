'use client';

import React, { useState } from 'react';
import { submitMembership } from '@/app/membership/actions';
import { MembershipFormData } from '@nusc/membership';
import './membership.css';

export default function SplitMembershipLayout() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<Record<string, unknown> | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data: MembershipFormData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      password: formData.get('password') as string,
      dateOfBirth: formData.get('dateOfBirth') as string,
      cityDistrict: formData.get('cityDistrict') as string,
      termsAccepted: (formData.get('termsAccepted') === 'on' ? true : undefined) as unknown as true,
      privacyAccepted: (formData.get('termsAccepted') === 'on' ? true : undefined) as unknown as true,
      marketingConsent: formData.get('marketingConsent') === 'on',
    };

    const result = await submitMembership(data);

    setIsSubmitting(false);

    if (result.success) {
      setSuccessData(result.member);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="split-layout-wrapper">
      
      {/* LEFT SIDE - BENEFITS */}
      <div className="split-left-pane">
        {/* Background decorative elements */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.1, background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%)' }} />
        
        {/* Logo/Brand (Back to Home) */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff', zIndex: 10, marginBottom: '60px' }}>
          <span className="brand-mark" style={{ width: '40px', height: '40px', display: 'block', background: 'var(--logo) center/contain no-repeat' }}></span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontFamily: '"Barlow Condensed", sans-serif', fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase' }}>Nagaland United</span>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.2em', opacity: 0.7, textTransform: 'uppercase' }}>Sports Club</span>
          </div>
        </a>

        <div style={{ zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
            <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="12" rx="2"></rect>
                <path d="M7 8V6a2 2 0 012-2h6a2 2 0 012 2v2"></path>
                <circle cx="12" cy="14" r="2"></circle>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Match Ticket Benefits</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Eligible members can access member ticket benefits, priority seating, and early booking through our ticketing partner, Ahibi.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
            <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.38 3.46L16 2a8.5 8.5 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Merchandise Offers</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Access special member pricing and selected merchandise offers on official NUSC apparel and accessories.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flexShrink: 0, width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Exclusive Updates</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Receive members-only newsletters, behind-the-scenes content, and invitations to exclusive club events.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="split-right-pane">
        
        <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
          
          {successData ? (
            <div style={{ padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <h2 style={{ color: '#0f172a', fontSize: '2rem', marginBottom: '16px', fontWeight: 700 }}>
                Welcome to NUSC!
              </h2>
              <p style={{ color: '#475569', marginBottom: '24px', fontSize: '1.1rem' }}>
                Your registration was successful. Welcome to the club, {successData.first_name}!
              </p>
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  Your Membership Number
                </p>
                <p style={{ color: 'var(--red)', fontSize: '2rem', fontWeight: 'bold' }}>
                  {successData.membership_number}
                </p>
              </div>
              <p style={{ color: '#475569', fontSize: '0.9rem' }}>
                Keep this number handy. You will use it to access ticket benefits on Ahibi and merchandise discounts in our store.
              </p>
              <a href="/" className="btn btn-red" style={{ marginTop: '20px', display: 'inline-block' }}>Back to Home</a>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '40px' }}>
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem', marginBottom: '24px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                  Go Back
                </a>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
                  Sign up as<br />
                  <span style={{ color: 'var(--navy-600)' }}>NUSC Member</span>
                </h1>
                <div style={{ width: '40px', height: '4px', background: '#e2e8f0', marginTop: '16px', borderRadius: '2px' }}></div>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '16px', borderRadius: '8px', marginBottom: '30px' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="split-mem-form">
                <div className="split-mem-row">
                  <div className="split-mem-group">
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName" placeholder="Enter your first name" required />
                  </div>
                  <div className="split-mem-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName" placeholder="Enter your last name" required />
                  </div>
                </div>

                <div className="split-mem-row">
                  <div className="split-mem-group">
                    <label htmlFor="email">Email Address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email" required />
                  </div>
                  <div className="split-mem-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Create a password" required minLength={8} />
                  </div>
                </div>

                <div className="split-mem-row">
                  <div className="split-mem-group">
                    <label htmlFor="phone">Mobile Number</label>
                    <input type="tel" id="phone" name="phone" placeholder="Enter your mobile number" required />
                  </div>
                  <div className="split-mem-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input type="date" id="dateOfBirth" name="dateOfBirth" required />
                  </div>
                </div>
                  <div className="split-mem-group">
                    <label htmlFor="cityDistrict">City / District</label>
                    <input type="text" id="cityDistrict" name="cityDistrict" placeholder="Enter city or district" required />
                  </div>

                <div className="split-mem-checkboxes" style={{ marginTop: '20px' }}>
                  <label className="split-mem-checkbox">
                    <input type="checkbox" name="termsAccepted" required />
                    <span>I agree with all <a href="#" style={{ color: 'var(--navy-600)', textDecoration: 'none', fontWeight: 500 }}>Terms and Conditions</a> and <a href="#" style={{ color: 'var(--navy-600)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policies</a> of NUSC.</span>
                  </label>
                  <label className="split-mem-checkbox" style={{ marginTop: '12px' }}>
                    <input type="checkbox" name="marketingConsent" />
                    <span>Send me NUSC news and promotional updates</span>
                  </label>
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                    Already a member? <a href="/login" style={{ color: 'var(--navy-600)', fontWeight: 600, textDecoration: 'none' }}>Log In</a>
                  </p>
                  <button type="submit" disabled={isSubmitting} style={{ 
                    background: 'var(--navy-600)', 
                    color: '#fff', 
                    border: 'none', 
                    padding: '12px 32px', 
                    borderRadius: '6px', 
                    fontSize: '1rem', 
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}>
                    {isSubmitting ? 'Signing Up...' : 'Sign Up'}
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
