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

const ZONE_LABELS: Record<string, string> = {
  ahibi: 'Gate / checkpoint',
  volunteer: 'Duty post',
  media: 'Media access area',
  crew: 'Production zone',
  management: 'Operations zone',
  officials: 'Officials area',
  medical: 'Medical post',
};

function formatPassDate(value: string) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not set';
}

function InfoIcon({ name }: { name: string }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.7,
  };

  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...common}>
      {name === 'access' && <><path d="M4 7.5h16v12H4z" /><path d="M8 7.5V5h8v2.5M8 12h4M8 15h8" /></>}
      {name === 'zone' && <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></>}
      {name === 'calendar' && <><rect x="4" y="5.5" width="16" height="15" rx="1.5" /><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h6" /></>}
      {name === 'clock' && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>}
      {name === 'venue' && <><path d="M3 9 12 4l9 5v10H3z" /><path d="M6 19v-6h12v6M8 10h.01M12 10h.01M16 10h.01M10 13v6M14 13v6" /></>}
    </svg>
  );
}

function IdCardScenery() {
  return (
    <svg className="id-pass-scenery" viewBox="0 0 340 240" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 147 70 93l25 20 46-53 53 53 36-28 53 47 57-29v137H0Z" fill="#f4f7fb" />
      <path d="m69 94 26 19 46-53 25 26-25-9-18 24-17-5-13 21-24-11-19 12-30 1Z" fill="#e7edf5" />
      <path d="m136 61 37 51 21-22 36 28 53-9 57 29" fill="none" stroke="#d4deeb" strokeWidth="2" />
      <path d="M0 162q44-18 86 0t84 0 84 0 86 0" fill="none" stroke="#d7dfeb" strokeWidth="2" />
      <path d="M0 173q44-18 86 0t84 0 84 0 86 0" fill="none" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M286 93V42m-12 6h24m-20 0-7 9m23-9 7 9m-21-2-7 9m23-9 7 9" fill="none" stroke="#c5d1e0" strokeWidth="2" />
      <path d="M0 184q55-10 110 0t110 0 120 0v56H0Z" fill="#eff3f8" />
      <path d="M0 196h340M0 205h340M0 214h340" stroke="#d9e1ec" strokeWidth="1" />
    </svg>
  );
}

export default function PassCardView({ pass }: PassCardViewProps) {
  const [qrReady, setQrReady] = useState(false);
  const [qrError, setQrError] = useState(false);
  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const category = pass.category?.toLowerCase() || '';
  const department = DEPARTMENT_LABELS[category] || pass.category || 'Workforce';
  const zoneLabel = ZONE_LABELS[category] || 'Assigned zone';
  const accessLabel = category === 'media' ? 'Media access' : category === 'officials' ? 'Match assignment' : 'Match access';
  const scheduled = new Date(pass.validFrom).getTime() > Date.now();
  const statusLabel = scheduled ? 'SCHEDULED' : 'APPROVED';
  const fields = [
    { label: accessLabel, value: pass.assignedMatch || 'Not specified', note: pass.accreditationType, icon: 'access' },
    { label: zoneLabel, value: pass.assignedZone || 'To be assigned', icon: 'zone' },
    ...(pass.mediaOutlet ? [{ label: 'Media outlet', value: pass.mediaOutlet, icon: 'access' }] : []),
    ...(pass.mediaOrganisationType ? [{ label: 'Media organisation', value: pass.mediaOrganisationType, icon: 'access' }] : []),
    { label: 'Valid from', value: formatPassDate(pass.validFrom), icon: 'calendar' },
    { label: 'Valid until', value: formatPassDate(pass.validUntil), icon: 'clock' },
    { label: 'Venue', value: pass.eventVenue || 'Chumukedima Football Stadium, Nagaland', icon: 'venue' },
  ];

  return (
    <div className="campaign-container id-pass-page">
      <div className="id-pass-controls no-print">
        <Link href="/campaign/status" className="btn-outline" style={{ fontSize: '13px', padding: '8px 14px' }}>
          ← Back to Status
        </Link>
        <button onClick={handlePrint} disabled={!qrReady} className="btn-primary" style={{ fontSize: '13px', padding: '8px 18px' }}>
          Print / Save ID
        </button>
      </div>

      <article className="id-pass-card" aria-label="NUSC workforce identity card">
        <div className="id-pass-slot" aria-hidden="true" />
        <header className="id-pass-header">
          <div className="id-pass-slashes" aria-hidden="true"><span /><span /><span /></div>
          <div className="id-pass-header-content">
            <img
              src="/images/nusc-crest.png"
              alt="Nagaland United Sports Club crest"
              width={58}
              height={58}
              className="id-pass-crest"
            />
            <span className="id-pass-divider" aria-hidden="true" />
            <div className="id-pass-brand">
              <strong>NAGALAND<br />UNITED SC</strong>
              <span>OFFICIAL MATCHDAY ID</span>
            </div>
            <span className={`id-pass-status ${scheduled ? 'scheduled' : 'active'}`}>{statusLabel}</span>
          </div>
          <div className="id-pass-header-rule" />
        </header>

        <div className="id-pass-body">
          <IdCardScenery />
          <section className="id-pass-profile" aria-label="Applicant details">
            {pass.signedPhotoUrl ? (
              <img src={pass.signedPhotoUrl} alt={`${pass.fullName} ID photo`} className="id-pass-photo" />
            ) : (
              <div className="id-pass-photo-fallback" aria-label="No applicant photo available">PHOTO</div>
            )}
            <div className="id-pass-identity">
              <div className="id-pass-department">{department}</div>
              <h2>{pass.fullName}</h2>
              <div className="id-pass-role-ribbon">{pass.assignedRole || 'Workforce staff'}</div>
              <div className="id-pass-number">
                <span>WORKFORCE ID</span>
                <strong>{pass.idNumber}</strong>
              </div>
              {pass.registrationId !== pass.idNumber && (
                <div className="id-pass-registration">Application {pass.registrationId}</div>
              )}
            </div>
          </section>

          <section className="id-pass-meta-grid" aria-label="Role and access details">
            {fields.map(field => (
              <div className="id-pass-meta-item" key={field.label}>
                <span className="id-pass-icon-tab"><InfoIcon name={field.icon} /></span>
                <span className="id-pass-info-copy">
                  <strong className="id-pass-meta-label">{field.label}</strong>
                  {field.note && <small className="id-pass-meta-note">{field.note}</small>}
                  <span className="id-pass-meta-value">{field.value}</span>
                </span>
              </div>
            ))}
          </section>

          <section className="id-pass-qr-box" aria-label="Entry and attendance QR">
            <div className="id-pass-qr-frame">
              <span className="id-pass-qr-corner top-left" aria-hidden="true" />
              <span className="id-pass-qr-corner top-right" aria-hidden="true" />
              <span className="id-pass-qr-corner bottom-left" aria-hidden="true" />
              <span className="id-pass-qr-corner bottom-right" aria-hidden="true" />
              <img
                src={`/api/campaign/id/${pass.passSlug}/qr`}
                alt={`Entry and attendance QR for ${pass.idNumber}`}
                onLoad={() => { setQrReady(true); setQrError(false); }}
                onError={() => { setQrReady(false); setQrError(true); }}
                className="id-pass-qr-image"
              />
            </div>
            {qrError && <p role="alert" className="id-pass-qr-error">QR unavailable. Refresh before printing this ID.</p>}
            <strong className="id-pass-qr-title">ENTRY &amp; ATTENDANCE QR</strong>
            <span className="id-pass-qr-note">Non-transferable · scan this same ID on every authorized match day.</span>
          </section>
        </div>

        <svg className="id-pass-bottom-trim" viewBox="0 0 340 28" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 7 80 18Q170 28 260 18l80-11v21H0Z" fill="#091d3b" />
          <path d="M0 7 80 18Q170 27 260 18l80-11v5l-80 12Q170 33 80 23L0 12Z" fill="#e21e2b" />
        </svg>
      </article>
    </div>
  );
}
