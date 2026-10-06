'use client';

import React, { useState } from 'react';
import { submitRegistration } from './actions';

export default function TrialRegistrationForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    // Combine first and last name
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    formData.append('fullName', `${firstName} ${lastName}`);

    const result = await submitRegistration(formData);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      setSuccess(true);
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '24px', borderRadius: '8px', textAlign: 'center', margin: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Application Submitted</h2>
        <p>Thank you for registering for the NUSC U23 Trials. We will review your application and contact you soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: '40px' }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Name Row */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Name</label>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1 }}>
            <input type="text" id="firstName" name="firstName" required style={inputStyle} />
            <span style={helperStyle}>First Name</span>
          </div>
          <div style={{ flex: 1 }}>
            <input type="text" id="lastName" name="lastName" required style={inputStyle} />
            <span style={helperStyle}>Last Name</span>
          </div>
        </div>
      </div>

      {/* Phone and Email Row */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="phone" style={labelStyle}>Phone Number</label>
          <input type="tel" id="phone" name="phone" required placeholder="(000) 000-0000" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="email" style={labelStyle}>E-mail</label>
          <input type="email" id="email" name="email" required placeholder="ex: myname@example.com" style={inputStyle} />
          <span style={helperStyle}>example@example.com</span>
        </div>
      </div>

      {/* DOB Row */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="dateOfBirth" style={labelStyle}>Date of Birth</label>
        <input type="date" id="dateOfBirth" name="dateOfBirth" required style={inputStyle} />
      </div>

      {/* Address */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="address" style={labelStyle}>Residential Address</label>
        <textarea id="address" name="address" required rows={3} placeholder="Street address, City, District" style={{...inputStyle, resize: 'vertical'}}></textarea>
        <span style={helperStyle}>Must be an address within Nagaland</span>
      </div>

      {/* CRS Number */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="crsNumber" style={labelStyle}>CRS Number</label>
        <input type="text" id="crsNumber" name="crsNumber" required style={inputStyle} />
        <span style={helperStyle}>As provided during preliminary registration</span>
      </div>

      {/* Documents */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="aadharCard" style={labelStyle}>Aadhar Card</label>
          <div style={{
            border: '1px solid var(--line-l)',
            padding: '16px',
            borderRadius: '4px',
            background: '#fafafa'
          }}>
            <input type="file" id="aadharCard" name="aadharCard" required accept="image/*,.pdf" style={{ width: '100%' }} />
            <span style={{...helperStyle, marginTop: '8px'}}>Please upload a clear scan of your Aadhar Card (JPG, PNG, PDF).</span>
          </div>
        </div>

        <div>
          <label htmlFor="indigenousCertificate" style={labelStyle}>Indigenous Certificate</label>
          <div style={{
            border: '1px solid var(--line-l)',
            padding: '16px',
            borderRadius: '4px',
            background: '#fafafa'
          }}>
            <input type="file" id="indigenousCertificate" name="indigenousCertificate" required accept="image/*,.pdf" style={{ width: '100%' }} />
            <span style={{...helperStyle, marginTop: '8px'}}>Please upload a clear scan of your Indigenous Certificate (JPG, PNG, PDF).</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="submit" disabled={isSubmitting} style={{
          background: 'var(--red)',
          color: 'var(--white)',
          border: 'none',
          padding: '16px 48px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.7 : 1,
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'background 0.2s'
        }}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </div>
    </form>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--ink)',
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '1px solid var(--line-l)',
  borderRadius: '4px',
  fontSize: '1rem',
  color: 'var(--ink)',
  outline: 'none',
  transition: 'border-color 0.2s',
  background: 'var(--white)'
};

const helperStyle = {
  display: 'block',
  fontSize: '0.8rem',
  color: 'var(--muted)',
  marginTop: '6px'
};
