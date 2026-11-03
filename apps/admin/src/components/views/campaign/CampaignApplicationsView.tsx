'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@payloadcms/ui';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import { deleteCampaignApplication, deleteCampaignApplications, getCampaignApplicationsList, getCampaignRoleOptions } from '../../../actions/campaignAdminActions';
import { CampaignApplicationDetailView } from './CampaignApplicationDetailView';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

const CATEGORY_LABELS: Record<string, string> = {
  ahibi: 'Ahibi',
  volunteer: 'Volunteers',
  media: 'Press and Media',
  crew: 'Crew',
  management: 'Management',
  officials: 'Match Officials',
  medical: 'Medical Team',
};
const MAX_BULK_APPLICATION_DELETE_COUNT = 100;
const CAMPAIGN_APPLICATIONS_PAGE_SIZE = 20;

export const CampaignApplicationsView: React.FC = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const staff = user as any;
  const staffRoles = staff?.roles || staff?.display_roles?.map((item: any) => item.role) || [];
  const canDeleteApplications = staffRoles.includes('super_admin');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const [selectedApplications, setSelectedApplications] = useState<Record<string, string>>({});
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState('');
  const [deletingSelectedApplications, setDeletingSelectedApplications] = useState(false);
  const bulkDeleteDialogRef = useRef<HTMLDialogElement>(null);
  const selectedApplicationIds = Object.keys(selectedApplications);
  const selectedApplicationCount = selectedApplicationIds.length;
  const allCurrentPageSelected = applications.length > 0 && applications.every(row => Boolean(selectedApplications[row.id]));
  const someCurrentPageSelected = applications.some(row => Boolean(selectedApplications[row.id]));
  const currentPageUnselectedCount = applications.filter(row => !selectedApplications[row.id]).length;
  const currentPageSelectionWouldExceedLimit = !allCurrentPageSelected
    && selectedApplicationCount + currentPageUnselectedCount > MAX_BULK_APPLICATION_DELETE_COUNT;

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleOptions, setRoleOptions] = useState<{ id: string; name: string; code: string }[]>([]);
  const allowedStatuses = ['submitted', 'under_review', 'approved', 'waitlisted', 'rejected'];
  const requestedStatus = searchParams.get('status');
  const [statusFilter, setStatusFilter] = useState(allowedStatuses.includes(requestedStatus || '') ? requestedStatus! : 'all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get('search') || '');
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setError(null);
      return getCampaignApplicationsList({ category: categoryFilter, roleId: roleFilter, status: statusFilter, search: appliedSearch, page, pageSize: CAMPAIGN_APPLICATIONS_PAGE_SIZE });
    })
      .then(res => {
        if (!active) return;
        setApplications(res.applications); setTotalPages(res.totalPages); setTotalCount(res.totalCount);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load applications'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryFilter, roleFilter, statusFilter, page, appliedSearch, refreshKey]);

  useEffect(() => {
    let active = true;
    setRoleFilter('all');
    getCampaignRoleOptions(categoryFilter)
      .then(options => { if (active) setRoleOptions(options); })
      .catch(() => { if (active) setRoleOptions([]); });
    return () => { active = false; };
  }, [categoryFilter]);

  useEffect(() => {
    const dialog = bulkDeleteDialogRef.current;
    if (!dialog) return;
    if (bulkDeleteDialogOpen && !dialog.open) dialog.showModal();
    else if (!bulkDeleteDialogOpen && dialog.open) dialog.close();
  }, [bulkDeleteDialogOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedApplications({});
    setBulkDeleteConfirmation('');
    setLoading(true);
    setPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  const toggleApplicationSelection = (application: any) => {
    setSelectedApplications(current => {
      const next = { ...current };
      if (next[application.id]) delete next[application.id];
      else if (selectedApplicationCount >= MAX_BULK_APPLICATION_DELETE_COUNT) return current;
      else next[application.id] = application.application_number;
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedApplications(current => {
      const next = { ...current };
      if (allCurrentPageSelected) {
        applications.forEach(application => delete next[application.id]);
      } else if (selectedApplicationCount + currentPageUnselectedCount > MAX_BULK_APPLICATION_DELETE_COUNT) {
        return current;
      } else {
        applications.forEach(application => { next[application.id] = application.application_number; });
      }
      return next;
    });
  };

  const clearApplicationSelection = () => {
    setSelectedApplications({});
    setBulkDeleteConfirmation('');
  };

  const handleDeleteApplication = async (application: any) => {
    if (!canDeleteApplications || deletingApplicationId || deletingSelectedApplications) return;
    const confirmed = window.confirm(
      `Permanently delete ${application.application_number} for ${application.full_name}?\n\nThis removes its QR pass, attendance and application history, and uploaded documents, and releases the applicant's phone/email. This cannot be undone.`
    );
    if (!confirmed) return;
    const typedRegistrationId = window.prompt(`Type ${application.application_number} to confirm deletion.`);
    if (typedRegistrationId === null) return;
    if (typedRegistrationId.trim() !== application.application_number) {
      setDeleteError('Registration ID did not match. Nothing was deleted.');
      return;
    }

    setDeletingApplicationId(application.id);
    setDeleteError(null);
    setDeleteNotice(null);
    try {
      const result = await deleteCampaignApplication(application.id, typedRegistrationId.trim());
      setSelectedApplications(current => {
        const next = { ...current };
        delete next[application.id];
        return next;
      });
      setDeleteNotice(result.storageCleanupWarning
        ? `Registration ${result.applicationNumber} was deleted, but some uploaded documents could not be removed. Contact a campaign manager for cleanup.`
        : `Registration ${result.applicationNumber} and its linked QR pass and attendance history were deleted.`);
      setLoading(true);
      if (applications.length === 1 && page > 1) setPage(currentPage => Math.max(1, currentPage - 1));
      else setRefreshKey(key => key + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Registration could not be deleted. Please retry.');
    } finally {
      setDeletingApplicationId(null);
    }
  };

  const handleDeleteSelectedApplications = async () => {
    const applicationIds = selectedApplicationIds;
    const confirmationPhrase = `DELETE ${applicationIds.length}`;
    if (!canDeleteApplications || applicationIds.length === 0 || deletingApplicationId || deletingSelectedApplications
        || bulkDeleteConfirmation.trim() !== confirmationPhrase) return;

    setDeletingSelectedApplications(true);
    setDeleteError(null);
    setDeleteNotice(null);
    try {
      const result = await deleteCampaignApplications(applicationIds, bulkDeleteConfirmation.trim());
      setBulkDeleteDialogOpen(false);
      setBulkDeleteConfirmation('');
      setSelectedApplications({});

      const successMessage = `Deleted ${result.deletedCount} selected registration${result.deletedCount === 1 ? '' : 's'} and their linked QR passes and attendance history.`;
      const unavailableMessage = result.alreadyUnavailableCount > 0
        ? ` ${result.alreadyUnavailableCount} selected registration${result.alreadyUnavailableCount === 1 ? ' was' : 's were'} already unavailable.`
        : '';
      const storageMessage = result.storageCleanupWarning
        ? ' Some uploaded documents could not be removed; contact a campaign manager for cleanup.'
        : '';
      setDeleteNotice(`${successMessage}${unavailableMessage}${storageMessage}`);

      const nextTotalCount = Math.max(0, totalCount - applicationIds.length);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotalCount / CAMPAIGN_APPLICATIONS_PAGE_SIZE));
      setLoading(true);
      if (page > nextTotalPages) setPage(nextTotalPages);
      else setRefreshKey(key => key + 1);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Selected registrations could not be deleted. Please retry.');
    } finally {
      setDeletingSelectedApplications(false);
    }
  };

  const getStatusBadge = (st: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      submitted: { bg: '#e0f2fe', color: '#0369a1' },
      under_review: { bg: '#fef3c7', color: '#92400e' },
      approved: { bg: '#dcfce7', color: '#15803d' },
      waitlisted: { bg: '#f3e8ff', color: '#6b21a8' },
      rejected: { bg: '#fee2e2', color: '#991b1b' },
      cancelled: { bg: '#f1f5f9', color: '#475569' },
    };
    const s = styles[st] || { bg: '#f1f5f9', color: '#475569' };
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: '4px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        ● {st.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="campaign-page" style={{ maxWidth: '1500px', margin: '0 auto' }}>
      <CampaignWorkspaceNav />
      {/* Page Title & Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e31f2b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Campaign Operations
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#050f24', margin: 0 }}>
            Workforce registrations
          </h1>
          <p style={{ margin: '6px 0 0', color: '#667085', fontSize: '14px' }}>{totalCount} applications · {statusFilter === 'submitted' ? 'Showing new submissions' : 'Review and assign campaign applicants'}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/api/campaign/export-registrations"
            style={{
              background: '#fff',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#0f172a',
            }}
          >
            Export all registrations CSV
          </a>
          <Link
            href="/admin/campaign/approved"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#0f172a',
            }}
          >
            Approved Candidates →
          </Link>
        </div>
      </div>

      {(deleteError || deleteNotice) && (
        <div
          role={deleteError ? 'alert' : 'status'}
          aria-live={deleteError ? 'assertive' : 'polite'}
          style={{
            marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            color: deleteError ? '#991b1b' : '#166534',
            background: deleteError ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${deleteError ? '#fecaca' : '#bbf7d0'}`,
          }}
        >
          {deleteError || deleteNotice}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', flex: '1 1 280px' }} role="search">
          <input
            type="search"
            aria-label="Search applications"
            placeholder="Name, phone, email, or registration ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#17452d',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setSelectedApplications({});
              setBulkDeleteConfirmation('');
              setLoading(true);
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="all">All Categories</option>
            <option value="ahibi">Ahibi</option>
          <option value="volunteer">Volunteers</option>
          <option value="media">Press and Media</option>
          <option value="crew">Crew</option>
          <option value="management">Management</option>
          <option value="officials">Match Officials</option>
          <option value="medical">Medical Team</option>
          </select>

          <select
            value={roleFilter}
            aria-label="Filter by role"
            onChange={(e) => {
              setSelectedApplications({});
              setBulkDeleteConfirmation('');
              setLoading(true);
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="all">All Roles</option>
            {roleOptions.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setSelectedApplications({});
              setBulkDeleteConfirmation('');
              setLoading(true);
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div role="alert" className="campaign-error-banner" style={{ marginBottom: '1rem' }}>
          {error} <button className="campaign-secondary-button" type="button" onClick={() => { setLoading(true); setRefreshKey(key => key + 1); }} style={{ marginLeft: 10 }}>Try again</button>
        </div>
      )}

      {canDeleteApplications && selectedApplicationCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
            marginBottom: '14px', padding: '12px 14px', borderRadius: '8px',
            color: '#7f1d1d', background: '#fff7f5', border: '1px solid #fecaca',
          }}
        >
          <div>
            <strong>{selectedApplicationCount} registration{selectedApplicationCount === 1 ? '' : 's'} selected</strong>
            <div style={{ marginTop: '3px', color: '#7c2d12', fontSize: '12px' }}>
              Selection stays across pages; search or filters clear it. Select up to {MAX_BULK_APPLICATION_DELETE_COUNT} at once.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="campaign-modal-close"
              type="button"
              onClick={clearApplicationSelection}
              disabled={deletingSelectedApplications || Boolean(deletingApplicationId)}
              style={{ padding: '8px 12px', borderRadius: '6px', background: '#fff', fontWeight: 600 }}
            >
              Clear selection
            </button>
            <button
              className="campaign-danger-button"
              type="button"
              onClick={() => { setBulkDeleteConfirmation(''); setDeleteError(null); setBulkDeleteDialogOpen(true); }}
              disabled={deletingSelectedApplications || Boolean(deletingApplicationId)}
              style={{ padding: '8px 12px', borderRadius: '6px', fontWeight: 700 }}
            >
              Delete selected ({selectedApplicationCount})
            </button>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="campaign-application-table-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table className="campaign-application-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {canDeleteApplications && (
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      ref={node => { if (node) node.indeterminate = someCurrentPageSelected && !allCurrentPageSelected; }}
                      onChange={toggleCurrentPageSelection}
                      disabled={loading || applications.length === 0 || Boolean(deletingApplicationId) || deletingSelectedApplications || currentPageSelectionWouldExceedLimit}
                      aria-label="Select all registrations on this page"
                      style={{ width: '16px', height: '16px', minWidth: '16px', margin: 0, accentColor: '#b42318', cursor: 'pointer' }}
                    />
                  )}
                  <span>Registration ID</span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Full Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Preferred Role</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Assigned Zone / Shift</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Submitted</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading applications...
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  {statusFilter !== 'all' || categoryFilter !== 'all' || appliedSearch
                    ? 'No applications match these filters. Clear a filter or search again.'
                    : 'No applications have been submitted yet.'}
                </td>
              </tr>
            ) : (
              applications.map((row) => (
                <tr key={row.id} aria-selected={Boolean(selectedApplications[row.id])} style={{ borderBottom: '1px solid #f1f5f9', background: selectedApplications[row.id] ? '#fffafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#050f24' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {canDeleteApplications && (
                        <input
                          type="checkbox"
                          checked={Boolean(selectedApplications[row.id])}
                          onChange={() => toggleApplicationSelection(row)}
                          disabled={loading || Boolean(deletingApplicationId) || deletingSelectedApplications || (!selectedApplications[row.id] && selectedApplicationCount >= MAX_BULK_APPLICATION_DELETE_COUNT)}
                          aria-label={`Select registration ${row.application_number}`}
                          style={{ width: '16px', height: '16px', minWidth: '16px', margin: 0, accentColor: '#b42318', cursor: 'pointer' }}
                        />
                      )}
                      <span>{row.application_number}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {row.full_name}
                    {row.potential_duplicate && (
                      <span style={{ display: 'block', marginTop: '4px', color: '#b45309', fontSize: '11px', fontWeight: 700 }}>
                        Possible duplicate · review
                      </span>
                    )}
                    <a href={`tel:${row.phone}`} style={{ display: 'inline-block', marginTop: 3, fontSize: '12px', color: '#526071', fontWeight: 400 }}>{row.phone}</a>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#334155' }}>
                    {CATEGORY_LABELS[row.category] || row.category}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {campaignRoleLabel(row.preferred_role, row.other_role)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(row.application_status)}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                    {row.assigned_zone ? `${row.assigned_zone} (${row.assigned_shift || 'Shift'})` : <span style={{ color: '#596579' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(row.submitted_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="campaign-open-application"
                        type="button"
                        onClick={() => setSelectedAppId(row.id)}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Open application
                      </button>
                      {canDeleteApplications && (
                        <button
                          className="campaign-danger-button"
                          type="button"
                          disabled={Boolean(deletingApplicationId) || deletingSelectedApplications}
                          onClick={() => void handleDeleteApplication(row)}
                          style={{
                            background: '#fff',
                            border: '1px solid #fca5a5',
                            color: '#b91c1c',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: deletingApplicationId || deletingSelectedApplications ? 'wait' : 'pointer',
                            opacity: deletingApplicationId && deletingApplicationId !== row.id ? 0.55 : 1,
                          }}
                        >
                          {deletingApplicationId === row.id ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="campaign-application-cards" aria-label="Applications">
        {loading ? <p className="campaign-mobile-state">Loading applications…</p> : applications.length === 0
          ? <p className="campaign-mobile-state">{statusFilter !== 'all' || categoryFilter !== 'all' || appliedSearch ? 'No applications match these filters.' : 'No applications have been submitted yet.'}</p>
          : applications.map(row => <article className="campaign-application-card" key={`mobile-${row.id}`}>
            <div className="campaign-application-card-top">
              <span>{row.application_number}</span>
              {getStatusBadge(row.application_status)}
            </div>
            {canDeleteApplications && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', fontSize: '13px', fontWeight: 600, color: '#344054' }}>
                <input
                  type="checkbox"
                  checked={Boolean(selectedApplications[row.id])}
                  onChange={() => toggleApplicationSelection(row)}
                  disabled={loading || Boolean(deletingApplicationId) || deletingSelectedApplications || (!selectedApplications[row.id] && selectedApplicationCount >= MAX_BULK_APPLICATION_DELETE_COUNT)}
                  aria-label={`Select registration ${row.application_number}`}
                  style={{ width: '18px', height: '18px', minWidth: '18px', margin: 0, accentColor: '#b42318', cursor: 'pointer' }}
                />
                Select registration
              </label>
            )}
            <h2>{row.full_name}</h2>
            <a className="campaign-application-phone" href={`tel:${row.phone}`}>{row.phone}</a>
            <dl>
              <div><dt>Category</dt><dd>{row.category}</dd></div>
              <div><dt>Preferred role</dt><dd>{campaignRoleLabel(row.preferred_role, row.other_role)}</dd></div>
              <div><dt>Assignment</dt><dd>{row.assigned_zone ? `${row.assigned_zone} · ${row.assigned_shift || 'Shift unassigned'}` : 'Not assigned yet'}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(row.submitted_at).toLocaleDateString()}</dd></div>
            </dl>
            <button className="campaign-primary-button campaign-open-application" type="button" onClick={() => setSelectedAppId(row.id)}>Open application</button>
            {canDeleteApplications && (
              <button
                className="campaign-danger-button"
                type="button"
                disabled={Boolean(deletingApplicationId) || deletingSelectedApplications}
                onClick={() => void handleDeleteApplication(row)}
                style={{
                  width: '100%', marginTop: '8px', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #fca5a5', background: '#fff', color: '#b91c1c',
                  fontWeight: 700, cursor: deletingApplicationId ? 'wait' : 'pointer',
                }}
              >
                {deletingApplicationId === row.id ? 'Deleting…' : 'Delete registration'}
              </button>
            )}
          </article>)}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Page {page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="campaign-pagination-button"
              disabled={page <= 1}
              onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '12px',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <button
              className="campaign-pagination-button"
              disabled={page >= totalPages}
              onClick={() => { setLoading(true); setPage((p) => p + 1); }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '12px',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedAppId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 15, 36, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedAppId(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CampaignApplicationDetailView
              key={selectedAppId}
              applicationId={selectedAppId}
              onClose={() => setSelectedAppId(null)}
              onStatusUpdated={() => { setLoading(true); setRefreshKey(key => key + 1); }}
            />
          </div>
        </div>
      )}

      <dialog
        ref={bulkDeleteDialogRef}
        className="campaign-delete-dialog"
        aria-labelledby="campaign-bulk-delete-title"
        aria-describedby="campaign-bulk-delete-description"
        onCancel={event => {
          if (deletingSelectedApplications) {
            event.preventDefault();
            return;
          }
          setBulkDeleteDialogOpen(false);
          setBulkDeleteConfirmation('');
        }}
      >
        <div style={{ padding: '24px', color: '#101828' }}>
          <h2 id="campaign-bulk-delete-title" style={{ margin: '0 0 8px', color: '#7f1d1d', fontSize: '20px' }}>
            Delete {selectedApplicationCount} selected registration{selectedApplicationCount === 1 ? '' : 's'}?
          </h2>
          <p id="campaign-bulk-delete-description" style={{ margin: '0 0 14px', color: '#475467', fontSize: '14px', lineHeight: 1.5 }}>
            This permanently deletes the selected Workforce applications, linked QR passes, attendance and application history, and uploaded documents. This cannot be undone.
          </p>
          <div style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '16px', padding: '10px 12px', border: '1px solid #e4e7ec', borderRadius: '8px', background: '#f9fafb' }}>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#344054', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.8 }}>
              {Object.values(selectedApplications).map(applicationNumber => <li key={applicationNumber}>{applicationNumber}</li>)}
            </ul>
          </div>
          <form onSubmit={event => { event.preventDefault(); void handleDeleteSelectedApplications(); }}>
            <label htmlFor="campaign-bulk-delete-confirmation" style={{ display: 'block', marginBottom: '6px', color: '#344054', fontSize: '13px', fontWeight: 700 }}>
              Type <span style={{ fontFamily: 'monospace', color: '#b42318' }}>DELETE {selectedApplicationCount}</span> to confirm
            </label>
            <input
              id="campaign-bulk-delete-confirmation"
              type="text"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
              value={bulkDeleteConfirmation}
              onChange={event => setBulkDeleteConfirmation(event.target.value)}
              disabled={deletingSelectedApplications}
              style={{ width: '100%', minHeight: '44px', padding: '10px 12px', border: '1px solid #98a2b3', borderRadius: '6px', fontSize: '14px', color: '#101828', background: '#fff' }}
            />
            {deleteError && (
              <p role="alert" style={{ margin: '10px 0 0', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
              <button
                className="campaign-modal-close"
                type="button"
                onClick={() => { setBulkDeleteDialogOpen(false); setBulkDeleteConfirmation(''); }}
                disabled={deletingSelectedApplications}
                style={{ minHeight: '42px', padding: '9px 14px', borderRadius: '6px', background: '#fff', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                className="campaign-danger-button"
                type="submit"
                disabled={deletingSelectedApplications || bulkDeleteConfirmation.trim() !== `DELETE ${selectedApplicationCount}` || selectedApplicationCount === 0}
                style={{ minHeight: '42px', padding: '9px 14px', borderRadius: '6px', fontWeight: 700 }}
              >
                {deletingSelectedApplications ? 'Deleting selected...' : `Delete ${selectedApplicationCount} selected registration${selectedApplicationCount === 1 ? '' : 's'}`}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
};
