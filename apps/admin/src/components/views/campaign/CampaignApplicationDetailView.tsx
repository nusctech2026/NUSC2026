'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@payloadcms/ui';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import { campaignPassUrl } from '../../../utils/campaignPassUrl';
import {
  getCampaignApplicationDetail,
  updateApplicationStatus,
  assignRoleZoneShift,
  issueCampaignId,
  emailCampaignPass,
} from '../../../actions/campaignAdminActions';

interface DetailViewProps {
  applicationId: string;
  onClose?: () => void;
  onStatusUpdated?: () => void;
}

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

  const loadDetail = () => getCampaignApplicationDetail(applicationId).then(data => {
    setError(null); setApp(data); setRoles(data.roleOptions); setMatches(data.matches);
    setAssignedRoleId(data.assigned_role_id || data.preferred_role_id);
    setEventId(data.event_id || ''); setAssignedZone(data.assigned_zone || '');
    setAssignedShift(data.assigned_shift || ''); setAdminNotes(data.admin_notes || '');
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
            Application #{app.application_number}
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
                {app.category}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#050f24' }}>
                {campaignRoleLabel(app.preferred_role, app.other_role)}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Gender: {app.gender} | DOB: {app.date_of_birth}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Submitted: {new Date(app.submitted_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', lineHeight: 1.6, borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div><strong>Phone:</strong> {app.phone}</div>
            <div><strong>Email:</strong> {app.email}</div>
            <div style={{ marginTop: '6px' }}><strong>Residential Address:</strong> {app.address}</div>
            <div style={{ marginTop: '6px' }}><strong>Availability:</strong> {app.availability}</div>
            {app.experience && (
              <div style={{ marginTop: '6px' }}><strong>Experience:</strong> {app.experience}</div>
            )}
            {app.reason_for_joining && (
              <div style={{ marginTop: '6px' }}><strong>Motivation:</strong> {app.reason_for_joining}</div>
            )}

            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
              <div><strong>Emergency Contact:</strong> {app.emergency_contact_name}</div>
              <div><strong>Emergency Phone:</strong> {app.emergency_contact_phone}</div>
            </div>
          </div>
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
                {roles.map(role => <option key={role.id} value={role.id} disabled={role.code === 'crew_others' && !app.other_role}>{campaignRoleLabel(role, app.other_role)}</option>)}
              </select>
              <label htmlFor="campaign-match-scope" style={{ display: 'block', marginBottom: '10px' }}>
                Match access
              </label>
              <select id="campaign-match-scope" value={eventId} onChange={e => setEventId(e.target.value)} style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '12px' }}>
                <option value="">All campaign matches within pass validity</option>
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
    </div>
  );
};
