'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { submitCampaignApplication, CampaignRoleItem, getCampaignRoles } from '../actions';
import '../campaign.css';

interface CampaignFormProps {
  fixedCategory?: 'ahibi' | 'volunteer' | 'crew';
}

const CATEGORY_META = {
  ahibi: {
    title: 'Ahibi Campaign Registration',
    badge: 'Ahibi Desk',
    desc: 'Apply for ticketing, gate scanning, security, frisking, supervision, tunnel entry, or VIP entry.',
    icon: '🎟️',
  },
  volunteer: {
    title: 'Volunteer Campaign Registration',
    badge: 'Matchday Volunteers',
    desc: 'Join the matchday operations team across pitchside stretcher boys, perimeter, security, supervisors, and hospitality.',
    icon: '🤝',
  },
  crew: {
    title: 'Crew & Technical Production Registration',
    badge: 'Technical & Production',
    desc: 'Work behind the scenes operating lights, LED hoardings, stadium PA sound, technical operations, and stage logistics.',
    icon: '⚡',
  },
};

export default function CampaignForm({ fixedCategory }: CampaignFormProps) {
  const router = useRouter();
  const [category, setCategory] = useState<'ahibi' | 'volunteer' | 'crew'>(fixedCategory || 'volunteer');
  const [roles, setRoles] = useState<CampaignRoleItem[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Form inputs
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const [preferredRoleId, setPreferredRoleId] = useState('');
  const [otherRole, setOtherRole] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('Matchdays (Home Matches)');
  const [reasonForJoining, setReasonForJoining] = useState('');

  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Fetch roles when category changes
  useEffect(() => {
    let active = true;
    async function loadRoles() {
      setLoadingRoles(true);
      try {
        const fetched = await getCampaignRoles(category);
        if (active) {
          setRoles(fetched);
          if (fetched.length > 0) {
            setPreferredRoleId(fetched[0].id);
          } else {
            setPreferredRoleId('');
          }
        }
      } catch (e) {
        console.error('Failed to load roles:', e);
      } finally {
        if (active) setLoadingRoles(false);
      }
    }
    loadRoles();
    return () => {
      active = false;
    };
  }, [category]);

  const selectedRoleObj = roles.find((r) => r.id === preferredRoleId);
  const isOtherRoleSelected = selectedRoleObj?.code === 'crew_others';

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Photograph exceeds 5MB size limit. Please upload a smaller photo.');
      return;
    }

    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setErrorMessage(null);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAccepted) {
      setErrorMessage('You must review and agree to the campaign regulations and declaration to submit.');
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!photoFile) {
      setErrorMessage('Please upload a passport-size photograph for event credentialing.');
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('fullName', fullName);
      fd.append('dateOfBirth', dateOfBirth);
      fd.append('gender', gender);
      fd.append('phone', phone);
      fd.append('email', email);
      fd.append('address', address);
      fd.append('category', category);
      fd.append('preferredRoleId', preferredRoleId);
      if (isOtherRoleSelected) {
        fd.append('otherRole', otherRole);
      }
      fd.append('experience', experience);
      fd.append('availability', availability);
      fd.append('reasonForJoining', reasonForJoining);
      fd.append('emergencyContactName', emergencyContactName);
      fd.append('emergencyContactPhone', emergencyContactPhone);
      fd.append('termsAccepted', 'true');
      fd.append('photo', photoFile);

      const res = await submitCampaignApplication(fd);

      if (!res.success || !res.applicationNumber) {
        setErrorMessage(res.error || 'Registration failed. Please verify all details and try again.');
        setIsSubmitting(false);
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // Success -> Redirect to Application Success Page
      router.push(
        `/campaign/application-success?num=${encodeURIComponent(res.applicationNumber)}&cat=${encodeURIComponent(category)}&name=${encodeURIComponent(fullName)}`
      );
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred during submission.');
      setIsSubmitting(false);
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const meta = CATEGORY_META[category];

  return (
    <div className="campaign-container" style={{ maxWidth: '840px', margin: '0 auto', padding: '20px' }}>
      {/* Category Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div className="campaign-badge">{meta.badge}</div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--camp-navy-950)', marginBottom: '8px' }}>
          {meta.title}
        </h1>
        <p style={{ color: 'var(--camp-muted)', fontSize: '1rem', maxWidth: '620px', margin: '0 auto' }}>
          {meta.desc}
        </p>
      </div>

      {/* Category Selector Tabs (if not locked to a specific category) */}
      {!fixedCategory && (
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '28px', flexWrap: 'wrap' }}>
          {(['volunteer', 'crew', 'ahibi'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={category === cat ? 'btn-primary' : 'btn-outline'}
              style={{ textTransform: 'capitalize', fontSize: '14px', padding: '8px 18px' }}
            >
              {CATEGORY_META[cat].icon} {cat}
            </button>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div ref={errorRef} className="alert-box error" role="alert">
          <div>⚠️</div>
          <div>
            <strong>Registration Notice:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="form-card">
        {/* Section 1: Candidate Identity */}
        <h2 className="form-section-title">
          <span>👤</span> 1. Personal & Contact Information
        </h2>

        <div className="form-group">
          <label htmlFor="fullName">
            Full Legal Name <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            id="fullName"
            type="text"
            className="form-control"
            placeholder="As per Government Identification Document"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="dateOfBirth">
              Date of Birth <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="dateOfBirth"
              type="date"
              className="form-control"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="gender">
              Gender <span className="req" aria-hidden="true">*</span>
            </label>
            <select
              id="gender"
              className="form-control"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="phone">
              Phone / WhatsApp Number <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="form-control"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <div className="form-hint">Staff may contact you about your application and matchday assignments.</div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email Address <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">
            Residential Address <span className="req" aria-hidden="true">*</span>
          </label>
          <textarea
            id="address"
            className="form-control"
            rows={2}
            placeholder="Town/Village, Colony/Ward, District, State"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </div>

        {/* Section 2: Passport Photograph */}
        <h2 className="form-section-title">
          <span>📷</span> 2. Passport Photograph (For Event ID Pass)
        </h2>
        <div className="form-group">
          <div className="photo-upload-container">
            <div className="photo-preview-box">
              {photoPreview ? (
                <img src={photoPreview} alt="Passport Preview" />
              ) : (
                <span style={{ fontSize: '30px', color: '#94a3b8' }}>👤</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                ref={photoInputRef}
                id="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoChange}
              />
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoFile ? 'Change Photograph' : 'Choose Passport Photo'}
                </button>
                {photoFile && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--camp-red)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="form-hint" style={{ marginTop: '8px' }}>
                Recent front-facing portrait with clear face visibility (Max 5MB, JPG/PNG/WebP). Stored securely in private storage.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Campaign Role & Preferences */}
        <h2 className="form-section-title">
          <span>⚙️</span> 3. Role Preferences & Availability
        </h2>

        <div className="form-group">
          <label htmlFor="preferredRoleId">
            Preferred Role <span className="req" aria-hidden="true">*</span>
          </label>
          {loadingRoles ? (
            <div style={{ padding: '10px', color: 'var(--camp-muted)', fontSize: '13px' }}>Loading roles...</div>
          ) : (
            <select
              id="preferredRoleId"
              className="form-control"
              value={preferredRoleId}
              onChange={(e) => setPreferredRoleId(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.description ? `— ${r.description}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {isOtherRoleSelected && (
          <div className="form-group">
            <label htmlFor="otherRole">
              Specify Role / Specialisation <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="otherRole"
              type="text"
              className="form-control"
              placeholder="e.g., Drone Videographer, Stage Carpenter, Cable Runner"
              value={otherRole}
              onChange={(e) => setOtherRole(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="availability">
            Availability & Shift Commitment <span className="req" aria-hidden="true">*</span>
          </label>
          <select
            id="availability"
            className="form-control"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            required
          >
            <option value="Matchdays (Home Matches)">Matchdays (Home Matches)</option>
            <option value="All Days (Full Season)">All Days (Full Season)</option>
            <option value="Weekends Only">Weekends Only</option>
            <option value="Flexible Schedule">Flexible Schedule</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="experience">Relevant Experience / Skills (Optional)</label>
          <textarea
            id="experience"
            className="form-control"
            rows={2}
            placeholder="Briefly describe any past experience in sports events, volunteering, or technical production..."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reasonForJoining">Why do you want to join NUSC? (Optional)</label>
          <textarea
            id="reasonForJoining"
            className="form-control"
            rows={2}
            placeholder="What motivates you to be part of the club matchday team?"
            value={reasonForJoining}
            onChange={(e) => setReasonForJoining(e.target.value)}
          />
        </div>

        {/* Section 4: Emergency Contact */}
        <h2 className="form-section-title">
          <span>🚨</span> 4. Emergency Contact
        </h2>

        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="emergencyContactName">
              Emergency Contact Name <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="emergencyContactName"
              type="text"
              className="form-control"
              placeholder="Parent / Guardian / Spouse"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="emergencyContactPhone">
              Emergency Contact Phone <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="emergencyContactPhone"
              type="tel"
              className="form-control"
              placeholder="10-digit emergency number"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 5: Terms & Declaration */}
        <h2 className="form-section-title">
          <span>📜</span> 5. Declaration & Club Regulations
        </h2>

        <div
          style={{
            background: 'var(--camp-paper)',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--camp-navy-900)',
            lineHeight: 1.6,
            marginBottom: '20px',
            border: '1px solid #e2e8f0',
          }}
        >
          <p style={{ margin: 0, marginBottom: '8px' }}>
            <strong>Code of Conduct & Verification:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>This submission registers your application for NUSC event operations. Passes are issued exclusively to approved candidates.</li>
            <li>Event IDs are non-transferable and must be visibly displayed or presented at designated stadium gates.</li>
            <li>Accredited personnel agree to adhere to club security standards, punctuality, and venue safety instructions.</li>
          </ul>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <input
            id="termsAccepted"
            type="checkbox"
            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--camp-red)' }}
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
          />
          <label htmlFor="termsAccepted" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--camp-navy-950)' }}>
            I confirm that the information is accurate and understand NUSC will use my application details, photograph, and emergency contact details to assess my application, plan event staffing, contact me, issue and verify approved credentials, and record match attendance. My photograph may be shown to authorised campaign and gate staff for identity checks. I am authorised to provide the emergency contact details. See the <Link href="/privacy-policy" target="_blank" rel="noreferrer" style={{ color: 'var(--camp-red)', textDecoration: 'underline' }}>Privacy Policy</Link>. <span className="req" aria-hidden="true">*</span>
          </label>
        </div>

        {/* Submit Actions */}
        <div style={{ marginTop: '30px', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn-primary"
            style={{ minWidth: '200px', height: '48px', fontSize: '16px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </button>
          <Link href="/campaign" className="btn-outline" style={{ height: '48px' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
