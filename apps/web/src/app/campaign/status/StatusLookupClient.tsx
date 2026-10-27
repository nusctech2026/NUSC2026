'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { checkCampaignStatus, requestCampaignAccess, CampaignStatusResult } from '../actions';
import '../campaign.css';

export default function StatusLookupClient({ verifiedEmail }: { verifiedEmail: string | null }) {
  const searchParams = useSearchParams();
  const prefillNum = searchParams.get('num') || '';

  const [applicationNumber, setApplicationNumber] = useState(prefillNum);
  const [email, setEmail] = useState(verifiedEmail || '');
  const [needsSignIn, setNeedsSignIn] = useState(!verifiedEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(searchParams.get('access') === 'expired'
    ? 'That sign-in link has expired or was opened in a different browser. Request a new link below.' : null);
  const [result, setResult] = useState<CampaignStatusResult['data'] | null>(null);

  const handleLookup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setMessage(null);
    setLoading(true);

    try {
      if (needsSignIn) {
        const access = await requestCampaignAccess(applicationNumber, email);
        if (!access.success) setError(access.error || 'Unable to send sign-in link.');
        else setMessage(access.message || 'Check your registered email.');
        return;
      }
      const res = await checkCampaignStatus(applicationNumber);
      if (!res.success || !res.data) {
        if (res.requiresSignIn) setNeedsSignIn(true);
        setError(res.error || 'No matching record found. Please check your credentials.');
      } else {
        setResult(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'System error searching application.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChipClass = (st: string) => {
    switch (st) {
      case 'approved':
        return 'status-chip approved';
      case 'waitlisted':
        return 'status-chip waitlisted';
      case 'under_review':
        return 'status-chip under_review';
      case 'rejected':
        return 'status-chip rejected';
      case 'cancelled':
        return 'status-chip cancelled';
      default:
        return 'status-chip submitted';
    }
  };

  const getStatusDescription = (st: string) => {
    switch (st) {
      case 'submitted':
        return 'Your application has been received and is queued for verification by the operations department.';
      case 'under_review':
        return 'Our coordinators are currently reviewing your availability, role preferences, and credentials.';
      case 'waitlisted':
        return 'You are on the matchday waitlist. Check this page for updates on upcoming positions.';
      case 'approved':
        return 'Your application has been approved. Your pass and matchday assignments are shown below when available.';
      case 'rejected':
        return 'Thank you for your interest. We are unable to offer an operational credential for this campaign round.';
      case 'cancelled':
        return 'This application has been cancelled.';
      default:
        return '';
    }
  };

  return (
    <div className="campaign-container" style={{ maxWidth: '720px', margin: '40px auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="campaign-badge">Credentials Portal</div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--camp-navy-950)', marginBottom: '8px' }}>
          Check Application Status
        </h1>
        <p style={{ color: 'var(--camp-muted)', fontSize: '1rem', maxWidth: '520px', margin: '0 auto' }}>
          Verify your registered email to view your application status and approved Event Pass.
        </p>
      </div>

      {/* Query Form */}
      <form onSubmit={handleLookup} className="form-card" style={{ marginBottom: '30px' }}>
        <div className="form-group">
          <label htmlFor="appNumber">
            Application Number <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="appNumber"
            type="text"
            className="form-control"
            placeholder="e.g. NUSC-CMP-2026-X7K9P"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
            required
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}
          />
        </div>

        {needsSignIn ? <div className="form-group">
          <label htmlFor="contact">
            Registered Email <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="contact"
            type="email"
            className="form-control"
            placeholder="Email used in your application"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <div className="form-hint">
            We send a secure sign-in link to this email. Open it in the same browser, then check your status.
          </div>
        </div> : <p>
          Signed in as {verifiedEmail}.{' '}
          <button type="button" onClick={() => { setNeedsSignIn(true); setResult(null); }}>Use another email</button>
        </p>}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', height: '46px', fontSize: '15px', marginTop: '10px' }}
          disabled={loading}
        >
          {loading ? 'Please wait...' : needsSignIn ? 'Send sign-in link' : 'View application status'}
        </button>
      </form>
      {message && <div className="alert-box" role="status">{message}</div>}

      {/* Error Alert */}
      {error && (
        <div className="alert-box error" role="alert">
          <div>⚠️</div>
          <div>{error}</div>
        </div>
      )}

      {/* Result Card */}
      {result && (
        <div className="form-card" style={{ borderTop: '4px solid var(--camp-navy-600)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--camp-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Application Record
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--camp-navy-950)', margin: '2px 0 4px' }}>
                {result.fullName}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--camp-muted)' }}>
                Applied for: <strong style={{ color: 'var(--camp-navy-900)' }}>{result.preferredRoleName}</strong> ({result.category.toUpperCase()})
              </div>
            </div>

            <div className={getStatusChipClass(result.status)}>
              ● {result.status.replace('_', ' ')}
            </div>
          </div>

          <div
            style={{
              background: 'var(--camp-paper)',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--camp-navy-900)',
              lineHeight: 1.55,
              marginBottom: '24px',
              border: '1px solid #e2e8f0',
            }}
          >
            {getStatusDescription(result.status)}
          </div>

          {/* If Approved with assignments */}
          {result.status === 'approved' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Matchday Assignment Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <div>
                  <span style={{ color: '#15803d', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Role</span>
                  <strong style={{ color: '#14532d' }}>{result.assignedRoleName || result.preferredRoleName}</strong>
                </div>
                <div>
                  <span style={{ color: '#15803d', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Zone</span>
                  <strong style={{ color: '#14532d' }}>{result.assignedZone || 'Awaiting staff assignment'}</strong>
                </div>
                <div>
                  <span style={{ color: '#15803d', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600 }}>Shift</span>
                  <strong style={{ color: '#14532d' }}>{result.assignedShift || 'Awaiting staff assignment'}</strong>
                </div>
              </div>

              {result.passSlug && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #dcfce7' }}>
                  <Link
                    href={`/campaign/id/${result.passSlug}`}
                    className="btn-primary"
                    style={{ background: '#15803d', display: 'inline-flex', width: 'auto' }}
                  >
                    View & Download Digital Event Pass 🎟️
                  </Link>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--camp-muted)', borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <span>Application #: <strong>{result.applicationNumber}</strong></span>
            <span>Submitted on: {new Date(result.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
