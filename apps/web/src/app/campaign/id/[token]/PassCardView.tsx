'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CampaignPassData } from '../../actions';

interface PassCardViewProps {
  pass: NonNullable<CampaignPassData['pass']>;
}

const DEPARTMENT_LABELS: Record<string, string> = {
  ahibi: 'Ahibi',
  volunteer: 'Volunteers',
  media: 'Press and Media',
  crew: 'Crew',
  management: 'Management',
  officials: 'Match Officials',
  medical: 'Medical Team',
};

export default function PassCardView({ pass }: PassCardViewProps) {
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState(false);
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const formattedValidUntil = new Date(pass.validUntil).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const formattedValidFrom = new Date(pass.validFrom).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="campaign-container" style={{ maxWidth: '580px', margin: '20px auto', padding: '20px' }}>
      {/* Top Controls (Hidden on Print) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }} className="no-print">
        <Link href="/campaign/status" className="btn-outline" style={{ fontSize: '13px', padding: '8px 14px' }}>
          ← Back to Status
        </Link>
        <button onClick={handlePrint} disabled={!qrReady} className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
          🖨️ Print / Save Pass
        </button>
      </div>

      {/* Official NUSC Event Credential Pass Card */}
      <div className="id-pass-card">
        {/* Pass Header */}
        <div className="id-pass-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--camp-red)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}
            >
              NU
            </div>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em', color: '#fff', textTransform: 'uppercase' }}>
                Nagaland United SC
              </div>
              <div style={{ fontSize: '10px', color: 'var(--camp-gold)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Official Matchday Credential
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(233, 185, 73, 0.2)',
              border: '1px solid var(--camp-gold)',
              color: 'var(--camp-gold)',
              fontSize: '10px',
              fontWeight: 800,
              padding: '4px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}
          >
            Verified 2026–27
          </div>
        </div>

        {/* Pass Body */}
        <div className="id-pass-body">
          <div className="id-pass-profile">
            {pass.signedPhotoUrl ? (
              <img src={pass.signedPhotoUrl} alt={pass.fullName} className="id-pass-photo" />
            ) : (
              <div className="id-pass-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                👤
              </div>
            )}

            <div className="id-pass-details" style={{ flex: 1, minWidth: 0 }}>
              <div className="role-badge">{DEPARTMENT_LABELS[pass.category] || pass.category} · {pass.accreditationType}</div>
              <h2>{pass.fullName}</h2>
              <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600, marginBottom: '6px' }}>
                {pass.assignedRole}
              </div>
              <div style={{ fontSize: '10px', color: '#cbd5e1', marginBottom: '2px' }}>Registration ID</div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--camp-gold)', fontWeight: 700 }}>
                {pass.registrationId}
              </div>
            </div>
          </div>

          {/* Operational Meta Details */}
          <div className="id-pass-meta-grid">
            <div className="id-pass-meta-item">
              <div className="label">Match access</div>
              <div className="val">{pass.assignedMatch}</div>
            </div>
            <div className="id-pass-meta-item">
              <div className="label">Assigned Zone</div>
              <div className="val">{pass.assignedZone}</div>
            </div>
            <div className="id-pass-meta-item">
              <div className="label">Shift Assignment</div>
              <div className="val">{pass.assignedShift}</div>
            </div>
            <div className="id-pass-meta-item">
              <div className="label">Valid From</div>
              <div className="val">{formattedValidFrom}</div>
            </div>
            <div className="id-pass-meta-item">
              <div className="label">Valid Until</div>
              <div className="val">{formattedValidUntil}</div>
            </div>
          </div>

          {/* Secure Gate Verification QR Matrix */}
          <div className="id-pass-qr-box">
            <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={`/api/campaign/id/${pass.passSlug}/qr`}
                alt="Gate Verification QR Code"
                onLoad={() => { setQrReady(true); setQrError(false); }}
                onError={() => { setQrReady(false); setQrError(true); }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            {qrError && <p role="alert">Unable to load your QR. Refresh this page before printing.</p>}
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Gate Check-in Barcode
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', textAlign: 'center' }}>
              Scan at stadium turnstile checkpoint for authorized entry
            </div>
          </div>
        </div>

        {/* Pass Footer */}
        <div className="id-pass-footer">
          <div>Venue: {pass.eventVenue}</div>
          <div style={{ marginTop: '3px', fontSize: '10px', color: '#64748b' }}>
            Non-transferable. Must be displayed at all times inside restricted stadium zones.
          </div>
        </div>
      </div>
    </div>
  );
}
