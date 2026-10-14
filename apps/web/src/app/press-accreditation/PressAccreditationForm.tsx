'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { submitPressAccreditation, AccreditationSubmissionResult } from './actions';
import './press-accreditation.css';

const MEDIA_ORG_TYPES = [
  'Print Media',
  'Television / Broadcast',
  'Digital News Portal',
  'Photography Agency',
  'Radio',
  'Independent Journalist',
  'Sports Content Creator',
  'Other',
];

const DESIGNATION_ROLES = [
  'Journalist / Reporter',
  'Photographer',
  'Videographer / Camera Operator',
  'Editor / Producer',
  'Presenter / Anchor',
  'Content Creator',
  'Other',
];

const ACCESS_AREAS = [
  { id: 'media_seating', label: 'Media / Press Seating', desc: 'Reserved covered press bench with desk space & power outlet' },
  { id: 'photography_area', label: 'Photography Area', desc: 'Designated pitchside photographer bib zones behind goal lines' },
  { id: 'press_conference', label: 'Press Conference Area', desc: 'Post-match press briefing room with head coach & captain' },
  { id: 'mixed_zone', label: 'Mixed Zone / Post-Match Interview Area', desc: 'Player walkthrough tunnel interview mixed zone' },
  { id: 'broadcast_area', label: 'Broadcast / Video Coverage Area', desc: 'Gantry & camera platforms for approved broadcast units' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'dslr_mirrorless', label: 'DSLR / Mirrorless Camera' },
  { id: 'video_camera', label: 'Video Camera' },
  { id: 'tripod_monopod', label: 'Tripod / Monopod' },
  { id: 'audio_equipment', label: 'Audio Recording Equipment' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'other_equipment', label: 'Other' },
];

const TERMS_AND_CONDITIONS = [
  'Registration only: This form collects registrations from interested press and media candidates. Submitting this registration does not automatically grant or guarantee an accreditation pass.',
  'NUSC staff will review all submitted registrations, and official press/media passes will be issued exclusively to selected candidates.',
  'Approved accreditation passes are strictly non-transferable and must be presented or displayed while inside the stadium.',
  'Accredited media personnel must comply with NUSC regulations, stadium security protocols and applicable competition media guidelines.',
  'Access will be limited to approved media zones. Restricted areas, including dressing rooms, technical areas and the field of play, are strictly prohibited unless specifically authorised.',
  'Photographers and videographers must comply with designated shooting zones and applicable broadcasting and media rights restrictions.',
  'Accreditation may be suspended or revoked at any time for misconduct, unauthorised access, misuse of credentials or violation of regulations.',
  'NUSC reserves the right to approve, decline or withdraw media accreditation at its sole discretion.',
  'Applicants are responsible for the accuracy and authenticity of all information and documentation provided.',
];


export default function PressAccreditationForm() {
  const [fullName, setFullName] = useState('');
  const [applicantSignature, setApplicantSignature] = useState('');
  const [orgType, setOrgType] = useState('');
  const [role, setRole] = useState('');
  const [accreditationType, setAccreditationType] = useState<'season' | 'single_match'>('season');
  const [singleMatchDetails, setSingleMatchDetails] = useState('');

  const [selectedAccess, setSelectedAccess] = useState<string[]>([
    'media_seating',
    'press_conference',
  ]);
  const [equipmentCarried, setEquipmentCarried] = useState('');

  // File states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [govtIdFile, setGovtIdFile] = useState<File | null>(null);
  const [mediaIdFile, setMediaIdFile] = useState<File | null>(null);

  // Form submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<AccreditationSubmissionResult | null>(null);

  const errorRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const govtIdInputRef = useRef<HTMLInputElement>(null);
  const mediaIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    if (!applicantSignature || applicantSignature === fullName) {
      setApplicantSignature(val);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleGovtIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGovtIdFile(e.target.files[0]);
    }
  };

  const handleMediaIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setMediaIdFile(e.target.files[0]);
    }
  };

  const toggleAccess = (id: string) => {
    setSelectedAccess((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (!photoFile) {
      setError('Please upload a recent passport-size photograph.');
      return;
    }
    if (!govtIdFile) {
      setError('Please upload a valid government-issued ID.');
      return;
    }
    if (!mediaIdFile) {
      setError('Please upload your official media ID card or editor authorisation letter.');
      return;
    }
    if (selectedAccess.length === 0) {
      setError('Please select at least one required access area.');
      return;
    }
    if (!equipmentCarried.trim()) {
      setError('Please specify the equipment to be carried into the stadium.');
      return;
    }
    if (accreditationType === 'single_match' && !singleMatchDetails.trim()) {
      setError('Please specify the match or date for single-match accreditation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formEl = e.currentTarget;
      const formData = new FormData(formEl);

      // Explicitly append selected access areas & equipment
      formData.delete('accessRequired');
      selectedAccess.forEach((acc) => formData.append('accessRequired', acc));

      formData.delete('equipmentCarried');
      formData.set('equipmentCarried', equipmentCarried.trim());

      const res = await submitPressAccreditation(formData);

      if (!res.success) {
        setError(res.error || 'Failed to submit accreditation. Please check the form.');
        setIsSubmitting(false);
        return;
      }

      setSubmissionResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="press-page-wrapper">
      {/* Hero Header */}
      <section className="press-hero-banner">
        <div className="press-hero-container">
          <div className="press-hero-badge-row">
            <div className="press-club-tag">
              <span className="dot" />
              Nagaland United Sports Club
            </div>
            <div className="press-season-pill">Season 2026–27 Official</div>
            {/* <div className="press-season-pill" style={{ borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              Media Desk
            </div> */}
          </div>

          <h1 className="press-hero-title">
            Press &amp; Media <span>Accreditation</span>
          </h1>

          <div className="press-hero-venue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Home Matches | Chümoukedima Football Stadium, Nagaland</span>
          </div>
        </div>
      </section>

      {/* Main Form or Success Screen */}
      <div className="press-form-container">
        {submissionResult && submissionResult.data ? (
          <div className="press-success-wrapper" style={{ maxWidth: '600px', margin: '40px auto', padding: '52px 32px', textAlign: 'center' }}>
            <div className="press-success-icon" style={{ width: '64px', height: '64px', margin: '0 auto 20px', background: '#dcfce7', color: '#16a34a' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 style={{ fontFamily: 'var(--font-barlow), sans-serif', fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--navy-950)', margin: '0 0 12px 0', letterSpacing: '0.02em' }}>
              Thank You!
            </h2>
            <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px 0' }}>
              Your registration has been submitted successfully.
            </p>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 auto 32px', maxWidth: '460px' }}>
              NUSC staff will review all registered press candidates and will reach out to you if you are selected for a media pass.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link
                href="/"
                className="btn btn-red"
                style={{ padding: '12px 36px', fontSize: '0.95rem', textDecoration: 'none' }}
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {/* Candidate Registration & Selection Process Notice Card */}
            <div className="press-notice-card">
              <div className="press-notice-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="press-notice-content">
                Nagaland United Sports Club (NUSC) invites registrations from interested journalists, photographers, videographers, and media professionals seeking to cover the club&apos;s home matches at Chümoukedima Football Stadium. Please register your details below. Note that all registrations will be evaluated by NUSC staff, and official press/media passes will be issued exclusively to selected candidates.
              </div>
            </div>

            {/* Error notification banner */}
            {error && (
              <div ref={errorRef} className="press-error-alert" role="alert">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Please check your submission</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECTION 1: PERSONAL INFORMATION */}
            {/* ============================================================== */}
            <div className="press-card">
              <div className="press-card-header">
                <div className="press-section-indicator">
                  <div className="press-section-num">01</div>
                  <div className="press-section-meta">
                    <h2>Section 1: Personal Information</h2>
                    <p>Accredited professional contact &amp; identity details</p>
                  </div>
                </div>
                <span className="press-section-badge">Required</span>
              </div>

              <div className="press-card-body">
                <div className="press-grid-2">
                  <div className="press-form-group">
                    <label htmlFor="fullName" className="press-label">
                      <span>1. Full Name <span className="req">*</span></span>
                      <span className="hint">As per official government ID</span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                      placeholder="e.g. Sentitemjen Jamir"
                      value={fullName}
                      onChange={handleFullNameChange}
                      className="press-input"
                    />
                  </div>

                  <div className="press-form-group">
                    <label htmlFor="phone" className="press-label">
                      <span>2. Mobile Number / WhatsApp <span className="req">*</span></span>
                      <span className="hint">For matchday broadcast alerts</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      placeholder="e.g. 9862000000"
                      className="press-input"
                    />
                  </div>
                </div>

                <div className="press-grid-2">
                  <div className="press-form-group">
                    <label htmlFor="email" className="press-label">
                      <span>3. Email Address <span className="req">*</span></span>
                      <span className="hint">Official / editorial email</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      placeholder="e.g. reporter@easternmirror.com"
                      className="press-input"
                    />
                  </div>

                  <div className="press-form-group">
                    <label htmlFor="residentialAddress" className="press-label">
                      <span>4. Residential Address <span className="req">*</span></span>
                      <span className="hint">Complete residential address with PIN</span>
                    </label>
                    <textarea
                      id="residentialAddress"
                      name="residentialAddress"
                      required
                      placeholder="House No., Colony / Ward, Town, District, PIN Code"
                      className="press-textarea"
                    />
                  </div>
                </div>

                <div className="press-grid-2">
                  {/* Photo upload */}
                  <div className="press-form-group">
                    <label className="press-label">
                      <span>5. Recent Passport-Size Photograph <span className="req">*</span></span>
                      <span className="hint">For physical matchday press badge</span>
                    </label>
                    <div
                      className={`press-dropzone ${photoFile ? 'has-file' : ''}`}
                      onClick={() => photoInputRef.current?.click()}
                    >
                      <input
                        ref={photoInputRef}
                        type="file"
                        id="photo"
                        name="photo"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={handlePhotoChange}
                      />
                      <div className="press-dropzone-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <div className="press-dropzone-title">
                        {photoFile ? photoFile.name : <span>Upload Passport Photo</span>}
                      </div>
                      <div className="press-dropzone-sub">
                        Clear front-facing color photo (JPG, PNG, max 5MB)
                      </div>

                      {photoPreview && (
                        <div className="press-file-preview-card">
                          <img src={photoPreview} alt="Preview" className="press-file-thumb" />
                          <div className="press-file-details">
                            <div className="press-file-name">{photoFile?.name}</div>
                            <div className="press-file-size">
                              {photoFile && `${(photoFile.size / 1024).toFixed(0)} KB`} · Ready for badge printing
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Govt ID upload */}
                  <div className="press-form-group">
                    <label className="press-label">
                      <span>6. Valid Government-Issued ID <span className="req">*</span></span>
                      <span className="hint">Aadhaar, Voter ID, Passport or DL</span>
                    </label>
                    <div
                      className={`press-dropzone ${govtIdFile ? 'has-file' : ''}`}
                      onClick={() => govtIdInputRef.current?.click()}
                    >
                      <input
                        ref={govtIdInputRef}
                        type="file"
                        id="govtId"
                        name="govtId"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        required
                        onChange={handleGovtIdChange}
                      />
                      <div className="press-dropzone-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <div className="press-dropzone-title">
                        {govtIdFile ? govtIdFile.name : <span>Upload Government ID</span>}
                      </div>
                      <div className="press-dropzone-sub">
                        PDF, JPG or PNG (max 5MB)
                      </div>

                      {govtIdFile && (
                        <div className="press-file-preview-card">
                          <div className="press-file-details">
                            <div className="press-file-name">{govtIdFile.name}</div>
                            <div className="press-file-size">
                              {(govtIdFile.size / 1024).toFixed(0)} KB · Government Verification ID
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 2: MEDIA ORGANISATION DETAILS */}
            {/* ============================================================== */}
            <div className="press-card">
              <div className="press-card-header">
                <div className="press-section-indicator">
                  <div className="press-section-num">02</div>
                  <div className="press-section-meta">
                    <h2>Section 2: Media Organisation Details</h2>
                    <p>Publisher, outlet accreditation &amp; professional designation</p>
                  </div>
                </div>
                <span className="press-section-badge">Required</span>
              </div>

              <div className="press-card-body">
                <div className="press-form-group">
                  <label htmlFor="mediaOrgName" className="press-label">
                    <span>7. Name of Media Organisation / Publication <span className="req">*</span></span>
                    <span className="hint">Newspaper, channel, agency, or portal name</span>
                  </label>
                  <input
                    type="text"
                    id="mediaOrgName"
                    name="mediaOrgName"
                    required
                    placeholder="e.g. Nagaland Post / The Morung Express / Hornbill TV"
                    className="press-input"
                  />
                </div>

                {/* 8. Type of Media Organisation */}
                <div className="press-form-group">
                  <label htmlFor="mediaOrgType" className="press-label">
                    <span>8. Type of Media Organisation <span className="req">*</span></span>
                    <span className="hint">Print media, TV broadcast, digital news portal, agency, etc.</span>
                  </label>
                  <input
                    type="text"
                    id="mediaOrgType"
                    name="mediaOrgType"
                    required
                    list="media-org-types"
                    placeholder="e.g. Print Media, TV / Broadcast, Digital News Portal, Photo Agency"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="press-input"
                  />
                  <datalist id="media-org-types">
                    {MEDIA_ORG_TYPES.map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>

                {/* 9. Designation / Role */}
                <div className="press-form-group">
                  <label htmlFor="designationRole" className="press-label">
                    <span>9. Designation / Role <span className="req">*</span></span>
                    <span className="hint">Your primary role covering the fixture</span>
                  </label>
                  <input
                    type="text"
                    id="designationRole"
                    name="designationRole"
                    required
                    list="designation-roles"
                    placeholder="e.g. Journalist / Reporter, Photographer, Videographer, Editor"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="press-input"
                  />
                  <datalist id="designation-roles">
                    {DESIGNATION_ROLES.map((dRole) => (
                      <option key={dRole} value={dRole} />
                    ))}
                  </datalist>
                </div>

                <div className="press-grid-2">
                  <div className="press-form-group">
                    <label htmlFor="mediaWebsiteUrl" className="press-label">
                      <span>10. Official Media Organisation Website / Social Media Link <span className="req">*</span></span>
                      <span className="hint">Website, YouTube, or verified profile</span>
                    </label>
                    <input
                      type="url"
                      id="mediaWebsiteUrl"
                      name="mediaWebsiteUrl"
                      required
                      placeholder="https://www.example.com or @channel_handle"
                      className="press-input"
                    />
                  </div>

                  {/* 11. Media ID Card / Authorisation Letter */}
                  <div className="press-form-group">
                    <label className="press-label">
                      <span>11. Official Media ID Card / Authorisation Letter <span className="req">*</span></span>
                      <span className="hint">Upload press card or editor assignment letter</span>
                    </label>
                    <div
                      className={`press-dropzone ${mediaIdFile ? 'has-file' : ''}`}
                      onClick={() => mediaIdInputRef.current?.click()}
                    >
                      <input
                        ref={mediaIdInputRef}
                        type="file"
                        id="mediaIdLetter"
                        name="mediaIdLetter"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        required
                        onChange={handleMediaIdChange}
                      />
                      <div className="press-dropzone-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="8.5" cy="7.5" r="4" />
                          <line x1="20" y1="8" x2="20" y2="14" />
                          <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                      </div>
                      <div className="press-dropzone-title">
                        {mediaIdFile ? mediaIdFile.name : <span>Upload Media ID / Letter</span>}
                      </div>
                      <div className="press-dropzone-sub">
                        PDF or Image scan with official company seal (max 5MB)
                      </div>

                      {mediaIdFile && (
                        <div className="press-file-preview-card">
                          <div className="press-file-details">
                            <div className="press-file-name">{mediaIdFile.name}</div>
                            <div className="press-file-size">
                              {(mediaIdFile.size / 1024).toFixed(0)} KB · Media Credential Document
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 3: ACCREDITATION REQUIREMENTS */}
            {/* ============================================================== */}
            <div className="press-card">
              <div className="press-card-header">
                <div className="press-section-indicator">
                  <div className="press-section-num">03</div>
                  <div className="press-section-meta">
                    <h2>Section 3: Accreditation Requirements</h2>
                    <p>Pass type, stadium zones &amp; broadcast / recording equipment</p>
                  </div>
                </div>
                <span className="press-section-badge">Required</span>
              </div>

              <div className="press-card-body">
                {/* 12. Type of Accreditation Requested */}
                <div className="press-form-group">
                  <label className="press-label">
                    <span>12. Type of Accreditation Requested <span className="req">*</span></span>
                    <span className="hint">Select duration of pass</span>
                  </label>
                  <div className="press-grid-2">
                    <label
                      className={`press-radio-card ${accreditationType === 'season' ? 'active' : ''}`}
                      style={{ padding: '16px' }}
                    >
                      <input
                        type="radio"
                        name="accreditationType"
                        value="season"
                        checked={accreditationType === 'season'}
                        onChange={() => setAccreditationType('season')}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                          Season Accreditation
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          All NUSC Home Matches at Chümoukedima Stadium (Season 2026–27)
                        </div>
                      </div>
                    </label>

                    <label
                      className={`press-radio-card ${accreditationType === 'single_match' ? 'active' : ''}`}
                      style={{ padding: '16px' }}
                    >
                      <input
                        type="radio"
                        name="accreditationType"
                        value="single_match"
                        checked={accreditationType === 'single_match'}
                        onChange={() => setAccreditationType('single_match')}
                      />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--navy-950)' }}>
                          Single-Match Accreditation
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          Single designated fixture coverage
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* 13. If Single-Match Accreditation, specify Match / Date */}
                  {accreditationType === 'single_match' && (
                    <div className="press-conditional-box">
                      <label htmlFor="singleMatchDetails" className="press-label">
                        <span>13. Specify Match / Date <span className="req">*</span></span>
                        <span className="hint">Fixture name, opponent, or scheduled date</span>
                      </label>
                      <input
                        type="text"
                        id="singleMatchDetails"
                        name="singleMatchDetails"
                        required={accreditationType === 'single_match'}
                        placeholder="e.g. NUSC vs Shillong Lajong FC — 28 November 2026"
                        value={singleMatchDetails}
                        onChange={(e) => setSingleMatchDetails(e.target.value)}
                        className="press-input"
                      />
                    </div>
                  )}
                </div>

                {/* 14. Access Required (Subject to Approval) */}
                <div className="press-form-group">
                  <label className="press-label">
                    <span>14. Access Required (Subject to Approval) <span className="req">*</span></span>
                    <span className="hint">All zones are subject to security clearance</span>
                  </label>
                  <div className="press-check-grid">
                    {ACCESS_AREAS.map((area) => {
                      const isChecked = selectedAccess.includes(area.id);
                      return (
                        <div
                          key={area.id}
                          className={`press-check-card ${isChecked ? 'checked' : ''}`}
                          onClick={() => toggleAccess(area.id)}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => { }}
                            id={`access_${area.id}`}
                          />
                          <div className="press-check-content">
                            <div className="press-check-title">{area.label}</div>
                            <div className="press-check-desc">{area.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 15. Equipment to Be Carried */}
                <div className="press-form-group">
                  <label htmlFor="equipmentCarried" className="press-label">
                    <span>15. Equipment to Be Carried <span className="req">*</span></span>
                    <span className="hint">Cameras, lenses, laptops, audio recorders, tripods, etc.</span>
                  </label>
                  <input
                    type="text"
                    id="equipmentCarried"
                    name="equipmentCarried"
                    required
                    placeholder="e.g. DSLR Camera (Sony A7IV), 70-200mm Lens, Laptop, Tripod"
                    value={equipmentCarried}
                    onChange={(e) => setEquipmentCarried(e.target.value)}
                    className="press-input"
                  />
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 4: TERMS & CONDITIONS */}
            {/* ============================================================== */}
            <div className="press-card">
              <div className="press-card-header">
                <div className="press-section-indicator">
                  <div className="press-section-num">04</div>
                  <div className="press-section-meta">
                    <h2>Section 4: Terms &amp; Conditions</h2>
                    <p>Official NUSC stadium media regulations &amp; accreditation protocols</p>
                  </div>
                </div>
                <span className="press-section-badge">Regulations</span>
              </div>

              <div className="press-card-body">
                <div className="press-terms-list">
                  {TERMS_AND_CONDITIONS.map((term, index) => (
                    <div key={index} className="press-term-item">
                      <strong className="num">{index + 1}</strong>
                      <div>{term}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* SECTION 5: DECLARATION */}
            {/* ============================================================== */}
            <div className="press-card">
              <div className="press-card-header">
                <div className="press-section-indicator">
                  <div className="press-section-num">05</div>
                  <div className="press-section-meta">
                    <h2>Section 5: Declaration</h2>
                    <p>Formal applicant confirmation, compliance consent &amp; signature</p>
                  </div>
                </div>
                <span className="press-section-badge">Declaration</span>
              </div>

              <div className="press-card-body">
                <div className="press-declaration-box">
                  <div className="press-declaration-text">
                    &quot;I hereby declare that the information provided is true and accurate. I understand that this form is a registration of interest and does not automatically grant or guarantee a press/media pass. I acknowledge that NUSC staff will review all registrations and issue media passes exclusively to selected candidates. If selected, I agree to comply with all rules and regulations established by Nagaland United Sports Club, the competition organisers and stadium authorities.&quot;
                  </div>

                  <div className="press-consent-checkboxes">
                    <label className="press-consent-row">
                      <input type="checkbox" name="termsAccepted" required defaultChecked />
                      <span>
                        I have read and agree to the accreditation terms and conditions. <span className="req">*</span>
                      </span>
                    </label>

                    <label className="press-consent-row">
                      <input type="checkbox" name="consentGiven" required defaultChecked />
                      <span>
                        I consent to NUSC using my submitted information for candidate verification, review, and official matchday communication. <span className="req">*</span>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="press-grid-2">
                  <div className="press-form-group">
                    <label htmlFor="applicantSignatureName" className="press-label">
                      <span>Applicant&apos;s Full Legal Name (Signature) <span className="req">*</span></span>
                      <span className="hint">Electronic signature confirmation</span>
                    </label>
                    <input
                      type="text"
                      id="applicantSignatureName"
                      name="applicantSignatureName"
                      required
                      value={applicantSignature}
                      onChange={(e) => setApplicantSignature(e.target.value)}
                      placeholder="Type your full legal name"
                      className="press-input"
                    />
                  </div>

                  <div className="press-form-group">
                    <label htmlFor="declarationDate" className="press-label">
                      <span>Date of Application <span className="req">*</span></span>
                      <span className="hint">Official filing timestamp</span>
                    </label>
                    <input
                      type="date"
                      id="declarationDate"
                      name="declarationDate"
                      required
                      defaultValue={todayStr}
                      className="press-input"
                    />
                  </div>
                </div>

                {/* Candidate Review & Selection Process Notice */}
                <div className="press-review-notice-box">
                  <div className="press-review-notice-header">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h4>Staff Review &amp; Pass Issuance Policy</h4>
                  </div>
                  <p>
                    Please note that this registration is an expression of interest to cover Nagaland United SC matches. Submitting this form does not automatically issue a press or media pass.
                  </p>
                  <p>
                    NUSC staff will thoroughly evaluate all candidate registrations. Official press/media passes will be issued exclusively to selected candidates prior to matchdays. Selected applicants will be contacted directly via email and WhatsApp with collection instructions and stadium media protocols.
                  </p>
                </div>

                {/* Submit button bar */}
                <div className="press-submit-bar" style={{ marginTop: '32px' }}>
                  <div className="press-submit-info">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Secure 256-bit encrypted submission to NUSC Media Department</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="press-submit-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner" />
                        Submitting Application...
                      </>
                    ) : (
                      <>
                        Submit Accreditation Application
                        <span aria-hidden="true">→</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Club Brand Tagline Banner */}
            <div className="press-club-tagline-banner">
              <h3>Nagaland United Sports Club</h3>
              <div className="motto">RISE TOGETHER · UNITY · PROGRESS · EXCELLENCE</div>
              <p>
                Official communication regarding accreditation approval, pass collection and matchday media access will be shared with successful applicants.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
