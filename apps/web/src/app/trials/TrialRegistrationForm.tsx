'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function TrialRegistrationForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    
    const aadharFile = formData.get('aadharCard') as File;
    if (!aadharFile || aadharFile.size === 0) {
      setError('Aadhar Card is required.');
      setIsSubmitting(false);
      return;
    }
    if (aadharFile.size > MAX_FILE_SIZE) {
      setError('Aadhar Card file size must be less than 2MB.');
      setIsSubmitting(false);
      return;
    }

    const certFile = formData.get('indigenousCertificate') as File;
    if (!certFile || certFile.size === 0) {
      setError('Indigenous Certificate is required.');
      setIsSubmitting(false);
      return;
    }
    if (certFile.size > MAX_FILE_SIZE) {
      setError('Indigenous Certificate file size must be less than 2MB.');
      setIsSubmitting(false);
      return;
    }

    // Combine first and last name
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const fullName = `${firstName} ${lastName}`;

    const payloadUrl = process.env.NEXT_PUBLIC_PAYLOAD_URL || 'http://localhost:3001';

    try {
      const uploadFile = async (file: File, altText: string) => {
        // Payload CMS requires unique filenames, so we prepend a timestamp and random string
        const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
        const renamedFile = new File([file], uniqueFilename, { type: file.type });

        const mediaFormData = new FormData();
        mediaFormData.append('file', renamedFile);
        mediaFormData.append('_payload', JSON.stringify({ alt: altText }));

        const res = await fetch(`${payloadUrl}/api/media`, {
          method: 'POST',
          body: mediaFormData,
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to upload ${altText}: ${errorText}`);
        }

        const data = await res.json();
        return data.doc.id;
      };

      const [certId, aadharId] = await Promise.all([
        uploadFile(certFile, fullName + ' Indigenous Certificate'),
        uploadFile(aadharFile, fullName + ' Aadhar Card')
      ]);

      const registrationData = {
        fullName,
        email: formData.get('email'),
        phone: formData.get('phone'),
        playerPosition: formData.get('playerPosition'),
        address: formData.get('address'),
        dateOfBirth: formData.get('dateOfBirth'),
        aadharCard: aadharId,
        crsNumber: formData.get('crsNumber'),
        indigenousCertificate: certId,
      };

      const regRes = await fetch(`${payloadUrl}/api/trial-registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (!regRes.ok) {
        const errorData = await regRes.json().catch(() => null);
        if (errorData && errorData.errors) {
          // Check for unique constraint validation error
          const isUniqueError = JSON.stringify(errorData).includes('Value must be unique');
          if (isUniqueError && JSON.stringify(errorData).includes('crsNumber')) {
            throw new Error('A registration with this CRS Number already exists. You can only register once.');
          }
          throw new Error(errorData.message || 'Failed to submit registration.');
        }
        throw new Error('Failed to submit registration. Please try again.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '24px', borderRadius: '8px', textAlign: 'center', margin: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Application Submitted</h2>
        <p style={{ marginBottom: '24px' }}>Thank you for registering for the NUSC U23 Trials. We will review your application and contact you soon.</p>
        <Link href="/" style={{
          display: 'inline-block',
          background: 'var(--navy-600, #1a3f7a)',
          color: 'white',
          padding: '10px 24px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .form-container {
          padding: 40px;
        }
        .form-row {
          display: flex;
          gap: 20px;
          margin-bottom: 24px;
        }
        .tooltip-container {
          position: relative;
          display: flex;
          align-items: center;
          cursor: help;
        }
        .tooltip-content {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #333;
          color: white;
          font-size: 0.85rem;
          border-radius: 4px;
          width: 250px;
          text-align: center;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 10;
        }
        .tooltip-content::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: #333 transparent transparent transparent;
        }
        .tooltip-container:hover .tooltip-content {
          opacity: 1;
        }
        @media (max-width: 600px) {
          .form-container {
            padding: 24px 16px;
          }
          .form-row {
            flex-direction: column;
            gap: 16px;
          }
          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
      <form onSubmit={handleSubmit} className="form-container">
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Name Row */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Name</label>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div style={{ flex: 1 }}>
            <input type="text" id="firstName" name="firstName" required placeholder="First Name" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <input type="text" id="lastName" name="lastName" required placeholder="Last Name" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Phone and Email Row */}
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <label htmlFor="phone" style={labelStyle}>Phone Number</label>
          <input type="tel" id="phone" name="phone" required placeholder="(000) 000-0000" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="email" style={labelStyle}>E-mail</label>
          <input type="email" id="email" name="email" required placeholder="example@example.com" style={inputStyle} />
        </div>
      </div>

      {/* DOB and Position Row */}
      <div className="form-row">
        <div style={{ flex: 1 }}>
          <label htmlFor="dateOfBirth" style={labelStyle}>Date of Birth</label>
          <input type="date" id="dateOfBirth" name="dateOfBirth" required style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="playerPosition" style={labelStyle}>Player Position</label>
          <select id="playerPosition" name="playerPosition" required style={inputStyle} defaultValue="">
            <option value="" disabled>Select position</option>
            <optgroup label="Goalkeeper">
              <option value="Goalkeeper (GK)">Goalkeeper (GK)</option>
            </optgroup>
            <optgroup label="Defender">
              <option value="Center Back (CB)">Center Back (CB)</option>
              <option value="Right Back (RB)">Right Back (RB)</option>
              <option value="Left Back (LB)">Left Back (LB)</option>
              <option value="Right Wing Back (RWB)">Right Wing Back (RWB)</option>
              <option value="Left Wing Back (LWB)">Left Wing Back (LWB)</option>
            </optgroup>
            <optgroup label="Midfielder">
              <option value="Defensive Midfielder (CDM)">Defensive Midfielder (CDM)</option>
              <option value="Central Midfielder (CM)">Central Midfielder (CM)</option>
              <option value="Attacking Midfielder (CAM)">Attacking Midfielder (CAM)</option>
              <option value="Right Midfielder (RM)">Right Midfielder (RM)</option>
              <option value="Left Midfielder (LM)">Left Midfielder (LM)</option>
            </optgroup>
            <optgroup label="Forward">
              <option value="Right Winger (RW)">Right Winger (RW)</option>
              <option value="Left Winger (LW)">Left Winger (LW)</option>
              <option value="Center Forward / Striker (ST)">Center Forward / Striker (ST)</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Address */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="address" style={labelStyle}>Residential Address</label>
        <textarea id="address" name="address" required rows={3} placeholder="Street address, City, District (Must be within Nagaland)" style={{...inputStyle, resize: 'vertical'}}></textarea>
      </div>

      {/* CRS Number */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <label htmlFor="crsNumber" style={{ ...labelStyle, marginBottom: 0 }}>CRS Number</label>
          <div className="tooltip-container">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div className="tooltip-content">
              Centralized Registration System (CRS) Number assigned to players by AIFF
            </div>
          </div>
        </div>
        <input type="text" id="crsNumber" name="crsNumber" required placeholder="As provided during preliminary registration" style={inputStyle} />
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
            <span style={{...helperStyle, marginTop: '8px'}}>Please upload a clear scan of your Aadhar Card (JPG, PNG, PDF). Max size: 2MB.</span>
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
            <span style={{...helperStyle, marginTop: '8px'}}>Please upload a clear scan of your Indigenous Certificate (JPG, PNG, PDF). Max size: 2MB.</span>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button type="submit" disabled={isSubmitting} className="submit-btn" style={{
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
          transition: 'background 0.2s',
          marginBottom: '24px'
        }}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
          For any inquiries or questions, please contact <strong>+91 70853 33972</strong>
        </p>
      </div>
    </form>
    </>
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
