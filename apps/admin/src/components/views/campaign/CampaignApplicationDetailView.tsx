'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@payloadcms/ui';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import { campaignPassUrl } from '../../../utils/campaignPassUrl';
import {
  getCampaignApplicationDetail,
  updateApplicationStatus,
  assignRoleZoneShift,
  updateCampaignRegistrationDetails,
  issueCampaignId,
  emailCampaignPass,
} from '../../../actions/campaignAdminActions';

interface DetailViewProps {
  applicationId: string;
  onClose?: () => void;
  onStatusUpdated?: () => void;
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

const MEDIA_ACCESS_OPTIONS = [
  { value: 'media_press_seating', label: 'Media / Press Seating', description: 'Reserved covered press bench with desk space and power outlet' },
  { value: 'photography_area', label: 'Photography Area', description: 'Designated pitchside photographer bib zones behind goal lines' },
  { value: 'press_conference_area', label: 'Press Conference Area', description: 'Post-match press briefing room with head coach and captain' },
  { value: 'mixed_zone_interview_area', label: 'Mixed Zone / Post-Match Interview Area', description: 'Player walkthrough tunnel interview mixed zone' },
  { value: 'broadcast_video_coverage_area', label: 'Broadcast / Video Coverage Area', description: 'Gantry and camera platforms for approved broadcast units' },
] as const;

const MEDIA_ORGANISATION_TYPES = [
  { value: 'kaki', label: 'Kaki' },
  { value: 'print_media', label: 'Print Media' },
  { value: 'press_media', label: 'Press Media' },
  { value: 'broadcast_tv', label: 'Broadcast / TV' },
  { value: 'digital_online_media', label: 'Digital / Online Media' },
  { value: 'independent_freelance', label: 'Independent / Freelance' },
  { value: 'other', label: 'Other' },
] as const;

export const CampaignApplicationDetailView: React.FC<DetailViewProps> = ({
  applicationId,
  onClose,
  onStatusUpdated,
}) => {
  const { user } = useAuth();
  const staff = user as any;
  const staffRoles = staff?.roles || staff?.display_roles?.map((item: any) => item.role) || [];
  const canManage = staffRoles.includes('super_admin') || staffRoles.includes('campaign_manager');
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assignment edit state
  const [assignedZone, setAssignedZone] = useState('');
  const [assignedRoleId, setAssignedRoleId] = useState('');
  const [eventId, setEventId] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [assignedShift, setAssignedShift] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionWarning, setActionWarning] = useState<string | null>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editOtherRole, setEditOtherRole] = useState('');
  const [editOrganisation, setEditOrganisation] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editAvailabilityMode, setEditAvailabilityMode] = useState<'' | 'all' | 'selected'>('');
  const [editAvailabilityMatchIds, setEditAvailabilityMatchIds] = useState<string[]>([]);
  const [editMediaOutlet, setEditMediaOutlet] = useState('');
  const [editMediaOrganisationType, setEditMediaOrganisationType] = useState('');
  const [editPortfolioUrl, setEditPortfolioUrl] = useState('');
  const [editMediaAccessTypes, setEditMediaAccessTypes] = useState<string[]>([]);
  const [editProfessionalBody, setEditProfessionalBody] = useState('');
  const [editProfessionalQualification, setEditProfessionalQualification] = useState('');
  const [editProfessionalRegistrationNumber, setEditProfessionalRegistrationNumber] = useState('');
  const [editProfessionalExperience, setEditProfessionalExperience] = useState('');
  const [editConflictOfInterest, setEditConflictOfInterest] = useState<'' | 'yes' | 'no'>('');
  const [editConflictDetails, setEditConflictDetails] = useState('');
  const [editTechnicalSpecialty, setEditTechnicalSpecialty] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editCrewWorkArrangement, setEditCrewWorkArrangement] = useState<'' | 'organisation' | 'independent'>('');
  const [editCrewOrganisation, setEditCrewOrganisation] = useState('');
  const [editCrewLeadName, setEditCrewLeadName] = useState('');
  const [editCrewLeadPhone, setEditCrewLeadPhone] = useState('');

  const safePortfolioUrl = (() => {
    if (!app?.portfolio_url) return null;
    try {
      const url = new URL(app.portfolio_url);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  })();

  const loadDetail = () => getCampaignApplicationDetail(applicationId).then(data => {
    setError(null); setApp(data); setRoles(data.roleOptions); setMatches(data.matches);
    setAssignedRoleId(data.assigned_role_id || data.preferred_role_id || '');
    setEventId(data.event_id || ''); setAssignedZone(data.assigned_zone || '');
    setAssignedShift(data.assigned_shift || ''); setAdminNotes(data.admin_notes || '');
    setEditFullName(data.full_name || ''); setEditPhone(data.phone || ''); setEditEmail(data.email || '');
    setEditOtherRole(data.other_role || ''); setEditOrganisation(data.organisation || '');
    setEditDesignation(data.designation || '');
    setEditAvailabilityMode(data.availability_mode === 'all' || data.availability_mode === 'selected'
      ? data.availability_mode : '');
    setEditAvailabilityMatchIds(Array.isArray(data.availability_match_ids) ? data.availability_match_ids : []);
    setEditMediaOutlet(data.media_outlet || ''); setEditPortfolioUrl(data.portfolio_url || '');
    setEditMediaOrganisationType(data.media_organisation_type || '');
    setEditMediaAccessTypes(Array.isArray(data.media_access_types) ? data.media_access_types : []);
    setEditProfessionalBody(data.professional_body || '');
    setEditProfessionalQualification(data.professional_qualification || '');
    setEditProfessionalRegistrationNumber(data.professional_registration_number || '');
    setEditProfessionalExperience(data.professional_experience || '');
    setEditConflictOfInterest(data.conflict_of_interest === true ? 'yes' : data.conflict_of_interest === false ? 'no' : '');
    setEditConflictDetails(data.conflict_details || '');
    setEditTechnicalSpecialty(data.technical_specialty || ''); setEditExperience(data.experience || '');
    setEditCrewWorkArrangement(data.crew_work_arrangement === 'organisation' || data.crew_work_arrangement === 'independent'
      ? data.crew_work_arrangement : '');
    setEditCrewOrganisation(data.crew_organisation || '');
    setEditCrewLeadName(data.crew_lead_name || '');
    setEditCrewLeadPhone(data.crew_lead_phone || '');
  }).catch(err => { setError(err instanceof Error ? err.message : 'Failed to load applicant'); })
    .finally(() => setLoading(false));

  useEffect(() => {
    if (applicationId) {
      loadDetail();
    }
  }, [applicationId]);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    setActionSuccess(null);
    setActionWarning(null);
    try {
      if (newStatus === 'approved') {
        // Approval should use the exact assignment currently shown in the form.
        await assignRoleZoneShift(applicationId, assignedRoleId, assignedZone, assignedShift, eventId || null);
      }
      await updateApplicationStatus(applicationId, newStatus, adminNotes);
      if (newStatus === 'approved') {
        try {
          await emailCampaignPass(applicationId);
          setActionSuccess('Approved, pass issued, and QR emailed to the candidate.');
        } catch (mailError) {
          setActionSuccess('Approved and pass issued.');
          setActionWarning(`The QR email was not sent: ${mailError instanceof Error ? mailError.message : 'Email delivery failed.'} Use “Email QR pass” to retry after fixing email setup.`);
        }
      } else {
        setActionSuccess(`Application status successfully updated to ${newStatus.toUpperCase()}`);
      }
      await loadDetail();
      onStatusUpdated?.();
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    setActionLoading(true);
    setActionSuccess(null);
    try {
      await assignRoleZoneShift(applicationId, assignedRoleId, assignedZone, assignedShift, eventId || null);
      setActionSuccess('Zone and shift assignments saved.');
      await loadDetail();
      onStatusUpdated?.();
    } catch (err: any) {
      alert('Error saving assignment: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!editAvailabilityMode) {
      setActionWarning('Choose all matches or selected matches before saving.');
      return;
    }
    if (app?.category === 'media' && editMediaOutlet.trim().length < 2) {
      setActionWarning('Enter the name of the media organisation or publication.');
      return;
    }
    if (app?.category === 'media' && !editMediaOrganisationType) {
      setActionWarning('Choose the type of media organisation.');
      return;
    }
    if (app?.category === 'media' && editMediaAccessTypes.length === 0) {
      setActionWarning('Select at least one access area for the media accreditation request.');
      return;
    }
    if (app?.category === 'officials' && editConflictOfInterest === 'yes' && editConflictDetails.trim().length < 2) {
      setActionWarning('Describe the club or relationship connected to the conflict of interest.');
      return;
    }
    if (app?.category === 'crew' && editCrewWorkArrangement === 'organisation'
      && (editCrewOrganisation.trim().length < 2 || editCrewLeadName.trim().length < 2
        || !/^\d{10}$/.test(editCrewLeadPhone.replace(/\D/g, '')))) {
      setActionWarning('Enter the organisation name and a crew lead name with a valid 10-digit phone number.');
      return;
    }
    setActionLoading(true);
    setActionSuccess(null);
    setActionWarning(null);
    try {
      await updateCampaignRegistrationDetails(applicationId, {
        fullName: editFullName,
        phone: editPhone,
        email: editEmail,
        otherRole: editOtherRole,
        organisation: editOrganisation,
        designation: editDesignation,
        availabilityMode: editAvailabilityMode,
        availabilityMatchIds: editAvailabilityMatchIds,
        mediaOutlet: editMediaOutlet,
        mediaOrganisationType: editMediaOrganisationType,
        portfolioUrl: editPortfolioUrl,
        mediaAccessTypes: editMediaAccessTypes,
        professionalBody: editProfessionalBody,
        professionalQualification: editProfessionalQualification,
        professionalRegistrationNumber: editProfessionalRegistrationNumber,
        professionalExperience: editProfessionalExperience,
        conflictOfInterest: editConflictOfInterest,
        conflictDetails: editConflictDetails,
        technicalSpecialty: editTechnicalSpecialty,
        experience: editExperience,
        crewWorkArrangement: editCrewWorkArrangement,
        crewOrganisation: editCrewOrganisation,
        crewLeadName: editCrewLeadName,
        crewLeadPhone: editCrewLeadPhone,
      });
      setEditingDetails(false);
      setActionSuccess('Registration details saved.');
      await loadDetail();
      onStatusUpdated?.();
    } catch (err) {
      setActionWarning(err instanceof Error ? err.message : 'Unable to save registration details.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIssueId = async () => {
    if (!confirm(app.issuedId ? 'Replace this pass? Its previous QR and pass link will stop working.' : 'Issue this approved candidate an Event ID?')) return;
    setActionLoading(true);
    setActionSuccess(null);
    try {
      const res = await issueCampaignId(applicationId, Boolean(app.issuedId));
      setActionSuccess(`Event ID Pass Issued: ${res.idNumber}`);
      await loadDetail();
      onStatusUpdated?.();
    } catch (err: any) {
      alert('Failed to issue ID: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailPass = async () => {
    if (!confirm(`Email the private pass and QR to ${app.email}?`)) return;
    setActionLoading(true);
    setActionSuccess(null);
    try {
      await emailCampaignPass(applicationId);
      setActionSuccess(`Pass and QR emailed to ${app.email}.`);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Pass email could not be sent.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading applicant profile...</div>;
  }

  if (error || !app) {
    return (
      <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', borderRadius: '8px' }}>
        {error || 'Applicant record not found'}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Registration ID · {app.application_number}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#050f24', margin: '2px 0 0' }}>
            {app.full_name}
          </h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {actionSuccess && (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px', fontWeight: 600 }}>
          ✓ {actionSuccess}
        </div>
      )}

      {actionWarning && (
        <div role="alert" style={{ background: '#fff7ed', color: '#9a3412', padding: '12px', border: '1px solid #fdba74', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px', fontWeight: 600 }}>
          {actionWarning}
        </div>
      )}

      {app.potential_duplicate && (
        <div role="status" style={{ background: '#fffbeb', color: '#92400e', padding: '12px', border: '1px solid #fcd34d', borderRadius: '6px', marginBottom: '1rem', fontSize: '13px', fontWeight: 600 }}>
          This registration matches an existing phone number or email and has been flagged for manual review.
        </div>
      )}

      {/* Main Grid: Info + Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Left Column: Profile & Details */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {app.signedPhotoUrl ? (
              <img
                src={app.signedPhotoUrl}
                alt={app.full_name}
                style={{ width: '90px', height: '115px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #cbd5e1' }}
              />
            ) : (
              <div style={{ width: '90px', height: '115px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                👤
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#e31f2b' }}>
                {DEPARTMENT_LABELS[app.category] || app.category}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#050f24' }}>
                {campaignRoleLabel(app.preferred_role, app.other_role)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Submitted: {new Date(app.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', lineHeight: 1.6, borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div><strong>Phone:</strong> {app.phone}</div>
            {app.email && <div><strong>Email:</strong> {app.email}</div>}
            {app.organisation && <div style={{ marginTop: '6px' }}><strong>Organisation / affiliation:</strong> {app.organisation}</div>}
            {app.designation && <div style={{ marginTop: '6px' }}><strong>{app.category === 'media' ? 'Designation / Role:' : 'Designation / position:'}</strong> {app.designation}</div>}
            {app.address && <div style={{ marginTop: '6px' }}><strong>Residential Address:</strong> {app.address}</div>}
            {app.availability && <div style={{ marginTop: '6px' }}><strong>Availability:</strong> {app.availability}</div>}
            {app.availability_mode === 'selected' && Array.isArray(app.availability_match_ids) && app.availability_match_ids.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <strong>Selected matches:</strong>{' '}
                {app.availability_match_ids.map((id: string) => {
                  const match = matches.find((item) => item.id === id);
                  return match ? `${match.title} (${new Date(match.start_date).toLocaleDateString()})` : 'Match details unavailable';
                }).join(', ')}
              </div>
            )}
            {app.category === 'media' && <div style={{ marginTop: '6px' }}><strong>Name of Media Organisation / Publication:</strong> {app.media_outlet || 'Not provided'}</div>}
            {app.category === 'media' && <div style={{ marginTop: '6px' }}><strong>Type of Media Organisation:</strong> {MEDIA_ORGANISATION_TYPES.find((type) => type.value === app.media_organisation_type)?.label || 'Not provided'}</div>}
            {app.category === 'media' && <div style={{ marginTop: '6px' }}><strong>Official Media ID Card / Authorisation Letter:</strong>{' '}{app.signedMediaAuthorisationUrl ? <a href={app.signedMediaAuthorisationUrl} target="_blank" rel="noopener noreferrer">View submitted document</a> : 'Not provided'}</div>}
            {safePortfolioUrl && <div style={{ marginTop: '6px' }}><strong>Published work:</strong> <a href={safePortfolioUrl} target="_blank" rel="noopener noreferrer">{app.portfolio_url}</a></div>}
            {app.category === 'media' && (
              <div style={{ marginTop: '6px' }}>
                <strong>Access requested (subject to approval):</strong>{' '}
                {Array.isArray(app.media_access_types) && app.media_access_types.length > 0
                  ? app.media_access_types.map((value: string) => MEDIA_ACCESS_OPTIONS.find((option) => option.value === value)?.label || value).join(', ')
                  : 'Not provided'}
              </div>
            )}
            {app.professional_body && <div style={{ marginTop: '6px' }}><strong>Association / professional body:</strong> {app.professional_body}</div>}
            {app.professional_qualification && <div style={{ marginTop: '6px' }}><strong>Qualification / grade:</strong> {app.professional_qualification}</div>}
            {app.professional_registration_number && <div style={{ marginTop: '6px' }}><strong>Registration / license number:</strong> {app.professional_registration_number}</div>}
            {app.category === 'officials' && <div style={{ marginTop: '6px' }}><strong>Recent officiating experience:</strong> {app.professional_experience || 'Not provided'}</div>}
            {app.category === 'officials' && <div style={{ marginTop: '6px' }}><strong>Conflict of interest:</strong> {app.conflict_of_interest === true ? 'Yes' : app.conflict_of_interest === false ? 'No' : 'Not recorded'}</div>}
            {app.category === 'officials' && app.conflict_details && <div style={{ marginTop: '6px' }}><strong>Conflict details:</strong> {app.conflict_details}</div>}
            {app.category === 'officials' && <div style={{ marginTop: '6px' }}><strong>Qualification / licence evidence:</strong>{' '}{app.signedOfficialCredentialUrl ? <a href={app.signedOfficialCredentialUrl} target="_blank" rel="noopener noreferrer">Download submitted document</a> : 'Not provided'}</div>}
            {app.technical_specialty && <div style={{ marginTop: '6px' }}><strong>Technical specialty:</strong> {app.technical_specialty}</div>}
            {app.experience && (
              <div style={{ marginTop: '6px' }}><strong>Experience:</strong> {app.experience}</div>
            )}
            {app.category === 'crew' && <div style={{ marginTop: '6px' }}><strong>Work arrangement:</strong> {app.crew_work_arrangement === 'organisation' ? 'Organisation / contractor' : app.crew_work_arrangement === 'independent' ? 'Independent / freelance' : 'Not recorded'}</div>}
            {app.category === 'crew' && app.crew_work_arrangement === 'organisation' && (
              <>
                <div style={{ marginTop: '6px' }}><strong>Organisation / crew provider:</strong> {app.crew_organisation || 'Not provided'}</div>
                <div style={{ marginTop: '6px' }}><strong>Crew lead / supervisor:</strong> {app.crew_lead_name || 'Not provided'}{app.crew_lead_phone ? ` · ${app.crew_lead_phone}` : ''}</div>
              </>
            )}
            {app.reason_for_joining && (
              <div style={{ marginTop: '6px' }}><strong>Motivation:</strong> {app.reason_for_joining}</div>
            )}

            {(app.emergency_contact_name || app.emergency_contact_phone) && <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
              <div><strong>Emergency Contact:</strong> {app.emergency_contact_name}</div>
              <div><strong>Emergency Phone:</strong> {app.emergency_contact_phone}</div>
            </div>}
          </div>

          {canManage && (
            <div style={{ marginTop: '16px' }}>
              {!editingDetails ? (
                <button
                  type="button"
                  onClick={() => setEditingDetails(true)}
                  style={{ padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Edit registration details
                </button>
              ) : (
                <div style={{ background: '#fff', padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#0f172a' }}>Edit registration details</h3>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                    Full name
                    <input value={editFullName} onChange={event => setEditFullName(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                  </label>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                    Phone number
                    <input value={editPhone} onChange={event => setEditPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" maxLength={10} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                  </label>
                  <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                    Email (optional)
                    <input type="email" value={editEmail} onChange={event => setEditEmail(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                  </label>
                  {(app.preferred_role?.code?.endsWith('_others') || app.preferred_role?.name === 'Others') && (
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                      Specify role
                      <input value={editOtherRole} onChange={event => setEditOtherRole(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                    </label>
                  )}
                  {app.category === 'management' && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Organisation / affiliation
                        <input value={editOrganisation} onChange={event => setEditOrganisation(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Designation / position
                        <input value={editDesignation} onChange={event => setEditDesignation(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                    </>
                  )}
                  <div style={{ margin: '12px 0', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                    <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                      Match availability
                      <select
                        value={editAvailabilityMode}
                        onChange={event => {
                          const mode = event.target.value as '' | 'all' | 'selected';
                          setEditAvailabilityMode(mode);
                          if (mode !== 'selected') setEditAvailabilityMatchIds([]);
                        }}
                        style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}
                      >
                        <option value="">Choose availability</option>
                        <option value="all">Available for all 10 home matches</option>
                        <option value="selected">Available for selected matches</option>
                      </select>
                    </label>
                    {editAvailabilityMode === 'selected' && (
                      <div style={{ display: 'grid', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                        <div style={{ color: '#64748b', fontSize: '12px' }}>{editAvailabilityMatchIds.length} of 10 matches selected.</div>
                        {matches.filter((match) => match.is_active || editAvailabilityMatchIds.includes(match.id)).map((match) => (
                          <label key={match.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px' }}>
                            <input
                              type="checkbox"
                              checked={editAvailabilityMatchIds.includes(match.id)}
                              disabled={!editAvailabilityMatchIds.includes(match.id) && editAvailabilityMatchIds.length >= 10}
                              onChange={event => setEditAvailabilityMatchIds((current) => event.target.checked
                                ? [...current, match.id]
                                : current.filter((id) => id !== match.id))}
                            />
                            <span>{match.title} · {new Date(match.start_date).toLocaleDateString()}{!match.is_active ? ' (inactive, existing selection)' : ''}</span>
                          </label>
                        ))}
                        {matches.filter((match) => match.is_active || editAvailabilityMatchIds.includes(match.id)).length === 0 && (
                          <span style={{ color: '#64748b', fontSize: '12px' }}>No matches are available to select.</span>
                        )}
                      </div>
                    )}
                  </div>
                  {app.category === 'media' && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Name of Media Organisation / Publication
                        <input value={editMediaOutlet} onChange={event => setEditMediaOutlet(event.target.value)} maxLength={255} required style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Type of Media Organisation
                        <select value={editMediaOrganisationType} onChange={event => setEditMediaOrganisationType(event.target.value)} required style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}>
                          <option value="">Choose a media organisation type</option>
                          {MEDIA_ORGANISATION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Designation / Role
                        <input type="text" value={editDesignation} onChange={event => setEditDesignation(event.target.value)} maxLength={255} placeholder="e.g. Journalist / Reporter, Photographer, Videographer, Editor" required style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                        <span style={{ display: 'block', marginTop: '3px', color: '#64748b' }}>Examples: Journalist / Reporter, Photographer, Videographer / Camera Operator, Editor / Producer, Presenter / Anchor.</span>
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Public work link (optional)
                        <input type="url" value={editPortfolioUrl} onChange={event => setEditPortfolioUrl(event.target.value)} maxLength={2048} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <fieldset style={{ margin: '12px 0', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                        <legend style={{ padding: '0 4px', fontSize: '12px', fontWeight: 700 }}>Access Required (Subject to Approval) *</legend>
                        <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '12px' }}>All zones are subject to security clearance.</p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {MEDIA_ACCESS_OPTIONS.map((option) => (
                            <label key={option.value} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px' }}>
                              <input
                                type="checkbox"
                                checked={editMediaAccessTypes.includes(option.value)}
                                onChange={(event) => setEditMediaAccessTypes((current) => event.target.checked
                                  ? [...current, option.value]
                                  : current.filter((value) => value !== option.value))}
                              />
                              <span><strong>{option.label}</strong><br /><span style={{ color: '#64748b' }}>{option.description}</span></span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  )}
                  {app.category === 'officials' && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Association / governing body
                        <input value={editProfessionalBody} onChange={event => setEditProfessionalBody(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Qualification / grade
                        <input value={editProfessionalQualification} onChange={event => setEditProfessionalQualification(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Registration / license number (optional)
                        <input value={editProfessionalRegistrationNumber} onChange={event => setEditProfessionalRegistrationNumber(event.target.value)} maxLength={100} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Recent officiating experience
                        <textarea value={editProfessionalExperience} onChange={event => setEditProfessionalExperience(event.target.value)} maxLength={2000} rows={3} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Conflict of interest
                        <select value={editConflictOfInterest} onChange={event => {
                          const answer = event.target.value as '' | 'yes' | 'no';
                          setEditConflictOfInterest(answer);
                          if (answer !== 'yes') setEditConflictDetails('');
                        }} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}>
                          <option value="">Not recorded</option>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </label>
                      {editConflictOfInterest === 'yes' && (
                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                          Conflict details
                          <textarea value={editConflictDetails} onChange={event => setEditConflictDetails(event.target.value)} maxLength={2000} rows={3} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                        </label>
                      )}
                    </>
                  )}
                  {app.category === 'medical' && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Qualification / certification
                        <input value={editProfessionalQualification} onChange={event => setEditProfessionalQualification(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Registration body (optional)
                        <input value={editProfessionalBody} onChange={event => setEditProfessionalBody(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        License / registration number (optional)
                        <input value={editProfessionalRegistrationNumber} onChange={event => setEditProfessionalRegistrationNumber(event.target.value)} maxLength={100} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                    </>
                  )}
                  {app.category === 'crew' && (
                    <>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Work arrangement
                        <select value={editCrewWorkArrangement} onChange={event => {
                          const arrangement = event.target.value as '' | 'organisation' | 'independent';
                          setEditCrewWorkArrangement(arrangement);
                          if (arrangement !== 'organisation') {
                            setEditCrewOrganisation('');
                            setEditCrewLeadName('');
                            setEditCrewLeadPhone('');
                          }
                        }} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }}>
                          <option value="">Not recorded</option>
                          <option value="organisation">Working through an organisation / contractor</option>
                          <option value="independent">Independent / freelance</option>
                        </select>
                      </label>
                      {editCrewWorkArrangement === 'organisation' && (
                        <>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                            Organisation / crew provider
                            <input value={editCrewOrganisation} onChange={event => setEditCrewOrganisation(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                          </label>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                            Crew lead / supervisor name
                            <input value={editCrewLeadName} onChange={event => setEditCrewLeadName(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                          </label>
                          <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                            Crew lead / supervisor phone
                            <input type="tel" inputMode="numeric" value={editCrewLeadPhone} onChange={event => setEditCrewLeadPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                          </label>
                        </>
                      )}
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Technical specialty (optional)
                        <input value={editTechnicalSpecialty} onChange={event => setEditTechnicalSpecialty(event.target.value)} maxLength={255} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                      <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px' }}>
                        Relevant experience (optional)
                        <textarea value={editExperience} onChange={event => setEditExperience(event.target.value)} maxLength={2000} rows={3} style={{ display: 'block', width: '100%', padding: '8px', marginTop: '4px' }} />
                      </label>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="button" disabled={actionLoading} onClick={handleSaveDetails} className="btn-primary">
                      {actionLoading ? 'Saving…' : 'Save details'}
                    </button>
                    <button type="button" disabled={actionLoading} onClick={() => setEditingDetails(false)} className="btn-outline">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Actions & Assignments */}
        <div>
          {/* Status Review Box */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
              Current Status: <strong style={{ color: '#050f24' }}>{app.application_status.toUpperCase()}</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange('under_review')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d97706', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Mark Under Review
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange('waitlisted')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #9333ea', background: '#f3e8ff', color: '#6b21a8', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Waitlist
              </button>
              <button
                type="button"
                disabled={actionLoading || !canManage || app.application_status === 'approved'}
                onClick={() => handleStatusChange('approved')}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #16a34a', background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                {app.application_status === 'approved' ? 'Approved · pass issued' : 'Approve, issue ID & email pass'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusChange('rejected')}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #dc2626', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                ✕ Reject
              </button>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Admin Internal Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                placeholder="Internal evaluation notes..."
              />
            </div>
          </div>

          {/* Assignment & Credential Issuance (if approved) */}
          {canManage && (
            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '10px' }}>
                Matchday Deployment Assignment
              </div>
              <label htmlFor="campaign-assigned-role" style={{ display: 'block', marginBottom: '10px' }}>
                Assigned role
              </label>
              <select id="campaign-assigned-role" value={assignedRoleId} onChange={e => setAssignedRoleId(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '12px' }}>
                {roles.map(role => <option key={role.id} value={role.id} disabled={role.code.endsWith('_others') && !app.other_role}>{campaignRoleLabel(role, app.other_role)}</option>)}
              </select>
              <label htmlFor="campaign-match-scope" style={{ display: 'block', marginBottom: '10px' }}>
                Match access
              </label>
              <select id="campaign-match-scope" value={eventId} onChange={e => setEventId(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '12px' }}>
                <option value="">Season pass · all 10 NUSC home matches</option>
                {matches.map(match => <option key={match.id} value={match.id}>{match.title}</option>)}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label htmlFor="campaign-zone" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#15803d', marginBottom: '3px' }}>
                    Assigned Zone
                  </label>
                  <input
                    id="campaign-zone"
                    type="text"
                    value={assignedZone}
                    onChange={(e) => setAssignedZone(e.target.value)}
                    placeholder="e.g. Main Stand - Gate 1"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label htmlFor="campaign-shift" style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#15803d', marginBottom: '3px' }}>
                    Assigned Shift
                  </label>
                  <input
                    id="campaign-shift"
                    type="text"
                    value={assignedShift}
                    onChange={(e) => setAssignedShift(e.target.value)}
                    placeholder="e.g. Morning Shift A"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '13px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={actionLoading}
                style={{ background: '#15803d', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginBottom: '14px' }}
              >
                Save Assignment
              </button>

              {/* ID Credential Box */}
              {app.application_status === 'approved' && <div style={{ borderTop: '1px dashed #86efac', paddingTop: '14px' }}>
                {app.issuedId ? (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Issued Credential</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#050f24', fontFamily: 'monospace' }}>
                      {app.issuedId.id_number}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Status: {app.issuedId.is_active ? 'Active Pass' : 'Revoked Pass'}
                    </div>
                    {campaignPassUrl(app.issuedId.pass_slug) && <a href={campaignPassUrl(app.issuedId.pass_slug)!} target="_blank" rel="noopener noreferrer">View / print pass</a>}
                    {app.issuedId.is_active && !app.issuedId.isExpired && canManage && campaignPassUrl(app.issuedId.pass_slug) && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button type="button" onClick={handleEmailPass} disabled={actionLoading} style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #15803d', background: '#15803d', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                        Email QR pass
                      </button>
                      <a href={`https://wa.me/?text=${encodeURIComponent(`Your NUSC campaign pass (ID ${app.issuedId.id_number}): ${campaignPassUrl(app.issuedId.pass_slug)}. Keep this private and show the QR at each match.`)}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 12px', borderRadius: 6, border: '1px solid #15803d', color: '#166534', fontWeight: 600, textDecoration: 'none' }}>
                        Share via WhatsApp
                      </a>
                    </div>}
                    {(!app.issuedId.is_active || app.issuedId.isExpired) && (
                      <button type="button" onClick={handleIssueId} disabled={actionLoading}>Replace expired or revoked pass</button>
                    )}
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={handleIssueId}
                      disabled={actionLoading}
                      style={{ background: '#050f24', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
                    >
                      🎟️ Generate & Issue Event ID Pass
                    </button>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>
                      Generates a secure cryptographic QR token and digital pass
                    </div>
                  </div>
                )}
              </div>}
            </div>
          )}
        </div>
      </div>

      <section style={{ marginTop: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px' }}>
        <h3 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '15px' }}>Change history</h3>
        {app.changeHistory?.length ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {app.changeHistory.map((entry: any) => (
              <details key={entry.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <summary style={{ cursor: 'pointer', color: '#334155', fontSize: '12px' }}>
                  {new Date(entry.changed_at).toLocaleString()} · {entry.changed_by}
                </summary>
                <ul style={{ margin: '8px 0 0', paddingLeft: '20px', color: '#475569', fontSize: '12px' }}>
                  {Object.entries(entry.changed_fields || {}).map(([field, change]: [string, any]) => (
                    <li key={field}>
                      <strong>{field.replaceAll('_', ' ')}:</strong> {String(change.from ?? '—')} → {String(change.to ?? '—')}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: '#64748b', fontSize: '12px' }}>No changes have been recorded.</p>
        )}
      </section>
    </div>
  );
};
