import React from 'react';
import styles from './CampaignWorkforceIdCard.module.css';

export interface CampaignWorkforceIdDetails {
  idNumber: string;
  registrationId: string;
  fullName: string;
  category: string;
  assignedRole: string;
  accreditationType?: string;
  assignedMatch: string;
  assignedZone: string;
  assignedShift: string;
  validFrom: string;
  validUntil: string;
  signedPhotoUrl: string | null;
  eventVenue: string;
}

type CampaignWorkforceIdCardProps = {
  details: CampaignWorkforceIdDetails;
  qrImage: string;
  status: 'active' | 'expired' | 'scheduled';
};

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
      {name === 'shift' && <><circle cx="8" cy="8" r="2.5" /><path d="M3 19v-1a5 5 0 0 1 10 0v1M16 5.5a2.5 2.5 0 0 1 0 5M17 14a4 4 0 0 1 4 4v1" /></>}
      {name === 'calendar' && <><rect x="4" y="5.5" width="16" height="15" rx="1.5" /><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h6" /></>}
      {name === 'clock' && <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>}
      {name === 'venue' && <><path d="M3 9 12 4l9 5v10H3z" /><path d="M6 19v-6h12v6M8 10h.01M12 10h.01M16 10h.01M10 13v6M14 13v6" /></>}
    </svg>
  );
}

function IdCardScenery() {
  return (
    <svg className={styles.scenery} viewBox="0 0 340 240" preserveAspectRatio="none" aria-hidden="true">
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

export default function CampaignWorkforceIdCard({ details, qrImage, status }: CampaignWorkforceIdCardProps) {
  const category = details.category?.toLowerCase() || '';
  const department = DEPARTMENT_LABELS[category] || details.category || 'Workforce';
  const statusLabel = status === 'expired' ? 'EXPIRED' : status === 'scheduled' ? 'SCHEDULED' : 'APPROVED';
  const statusClass = status === 'expired' ? styles.statusExpired : status === 'scheduled' ? styles.statusScheduled : styles.statusActive;
  const zoneLabel = ZONE_LABELS[category] || 'Assigned zone';
  const accessLabel = category === 'media' ? 'Media access' : category === 'officials' ? 'Match assignment' : 'Match access';
  const fields = [
    { label: accessLabel, value: details.assignedMatch || 'Not specified', note: details.accreditationType, icon: 'access' },
    { label: zoneLabel, value: details.assignedZone || 'To be assigned', icon: 'zone' },
    { label: 'Shift', value: details.assignedShift || 'To be assigned', icon: 'shift' },
    { label: 'Valid from', value: formatPassDate(details.validFrom), icon: 'calendar' },
    { label: 'Valid until', value: formatPassDate(details.validUntil), icon: 'clock' },
    { label: 'Venue', value: details.eventVenue || 'Chumukedima Football Stadium, Nagaland', icon: 'venue' },
  ];

  return (
    <article id="campaign-workforce-id-print" className={styles.card} aria-label="NUSC workforce identity card">
      <div className={styles.slot} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.slashes} aria-hidden="true"><span /><span /><span /></div>
        <div className={styles.headerContent}>
          <img className={styles.crest} src="/images/nusc-crest.png" alt="Nagaland United Sports Club crest" width="58" height="58" />
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.brand}>
            <strong>NAGALAND<br />UNITED SC</strong>
            <span>OFFICIAL MATCHDAY ID</span>
          </div>
          <span className={`${styles.status} ${statusClass}`}>{statusLabel}</span>
        </div>
        <div className={styles.headerRule} />
      </header>

      <div className={styles.body}>
        <IdCardScenery />
        <section className={styles.profile} aria-label="Applicant details">
          {details.signedPhotoUrl
            ? <img className={styles.photo} src={details.signedPhotoUrl} alt={`${details.fullName} ID photo`} />
            : <div className={styles.photoFallback} aria-label="No applicant photo available">PHOTO</div>}
          <div className={styles.identity}>
            <div className={styles.department}>{department}</div>
            <h2 className={styles.name}>{details.fullName}</h2>
            <div className={styles.roleRibbon}>{details.assignedRole || 'Workforce staff'}</div>
            <div className={styles.passNumber}>
              <span>WORKFORCE ID</span>
              <strong>{details.idNumber || details.registrationId}</strong>
            </div>
            {details.registrationId && details.registrationId !== details.idNumber && (
              <div className={styles.registration}>Application {details.registrationId}</div>
            )}
          </div>
        </section>

        <section className={styles.detailsGrid} aria-label="Role and access details">
          {fields.map(field => (
            <div className={styles.infoField} key={field.label}>
              <span className={styles.iconTab}><InfoIcon name={field.icon} /></span>
              <span className={styles.infoCopy}>
                <strong className={styles.infoLabel}>{field.label}</strong>
                {field.note && <small className={styles.infoNote}>{field.note}</small>}
                <span className={styles.infoValue}>{field.value}</span>
              </span>
            </div>
          ))}
        </section>

        <section className={styles.qrSection} aria-label="Entry and attendance QR">
          <div className={styles.qrFrame}>
            <span className={`${styles.qrCorner} ${styles.qrTopLeft}`} aria-hidden="true" />
            <span className={`${styles.qrCorner} ${styles.qrTopRight}`} aria-hidden="true" />
            <span className={`${styles.qrCorner} ${styles.qrBottomLeft}`} aria-hidden="true" />
            <span className={`${styles.qrCorner} ${styles.qrBottomRight}`} aria-hidden="true" />
            <img className={styles.qrImage} src={qrImage} alt={`Entry and attendance QR for ${details.idNumber || details.registrationId}`} />
          </div>
          <strong className={styles.qrTitle}>ENTRY &amp; ATTENDANCE QR</strong>
          <span className={styles.qrNote}>Non-transferable · scan this same ID on every authorized match day.</span>
        </section>
      </div>

      <svg className={styles.bottomTrim} viewBox="0 0 340 28" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 7 80 18Q170 28 260 18l80-11v21H0Z" fill="#091d3b" />
        <path d="M0 7 80 18Q170 27 260 18l80-11v5l-80 12Q170 33 80 23L0 12Z" fill="#e21e2b" />
      </svg>
    </article>
  );
}
