'use client';

import React, { useState } from 'react';
import { submitMembership } from '@/app/membership/actions';
import { MembershipFormData } from '@nusc/membership';
import './membership.css'; // We'll create this for scoped CSS

export default function MembershipForm() {
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
      privacyAccepted: (formData.get('privacyAccepted') === 'on' ? true : undefined) as unknown as true,
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

  if (successData) {
    return (
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="wrap" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ padding: '40px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ color: '#0f172a', fontSize: '2rem', marginBottom: '16px', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' }}>
              Welcome to NUSC Membership!
            </h2>
            <p style={{ color: '#475569', marginBottom: '24px', fontSize: '1.1rem' }}>
              Your registration was successful. Welcome to the club, {successData.first_name}!
            </p>
            <div style={{ background: '#f1f5f9', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                Your Membership Number
              </p>
              <p style={{ color: 'var(--red)', fontSize: '2rem', fontWeight: 'bold', fontFamily: '"Barlow Condensed", sans-serif' }}>
                {successData.membership_number}
              </p>
            </div>
            <p style={{ color: '#475569', fontSize: '0.9rem' }}>
              Keep this number handy. You will use it to access ticket benefits on Ahibi and merchandise discounts in our store.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ background: '#f1f5f9', color: '#0f172a' }}>
      <div className="wrap" style={{ maxWidth: '800px', padding: '60px 20px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '2.5rem', fontFamily: '"Barlow Condensed", sans-serif', textTransform: 'uppercase' }}>
          Register Now
        </h2>
        
        {error && (
          <div style={{ background: 'rgba(227, 31, 43, 0.1)', border: '1px solid var(--red)', color: '#fff', padding: '16px', borderRadius: '8px', marginBottom: '30px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mem-form">
          <div className="mem-form-row">
            <div className="mem-form-group">
              <label htmlFor="firstName">First Name *</label>
              <input type="text" id="firstName" name="firstName" required />
            </div>
            <div className="mem-form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input type="text" id="lastName" name="lastName" required />
            </div>
          </div>

          <div className="mem-form-row">
            <div className="mem-form-group">
              <label htmlFor="email">Email Address *</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="mem-form-group">
              <label htmlFor="password">Password *</label>
              <input type="password" id="password" name="password" required />
            </div>
          </div>

          <div className="mem-form-row">
            <div className="mem-form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input type="tel" id="phone" name="phone" required />
            </div>
            <div className="mem-form-group">
              <label htmlFor="dateOfBirth">Date of Birth *</label>
              <input type="date" id="dateOfBirth" name="dateOfBirth" required />
            </div>
          </div>

          <div className="mem-form-row">
            <div className="mem-form-group" style={{ width: '100%' }}>
              <label htmlFor="cityDistrict">City / District *</label>
              <input type="text" id="cityDistrict" name="cityDistrict" required />
            </div>
          </div>

          <div className="mem-form-checkboxes">
            <label className="mem-checkbox-label">
              <input type="checkbox" name="termsAccepted" required />
              <span>I agree to the Membership Terms & Conditions *</span>
            </label>
            <label className="mem-checkbox-label">
              <input type="checkbox" name="privacyAccepted" required />
              <span>I agree to the Privacy Policy *</span>
            </label>
            <label className="mem-checkbox-label">
              <input type="checkbox" name="marketingConsent" />
              <span>Send me NUSC news and promotional updates</span>
            </label>
          </div>

          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            <button type="submit" className="btn btn-red" disabled={isSubmitting} style={{ padding: '16px 40px', fontSize: '1.2rem', minWidth: '200px' }}>
              {isSubmitting ? 'Registering...' : 'Register as Member'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
