'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import { getCampaignApplicationsList } from '../../../actions/campaignAdminActions';
import { CampaignApplicationDetailView } from './CampaignApplicationDetailView';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

export const CampaignApplicationsView: React.FC = () => {
  const searchParams = useSearchParams();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
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
      return getCampaignApplicationsList({ category: categoryFilter, status: statusFilter, search: appliedSearch, page, pageSize: 20 });
    })
      .then(res => {
        if (!active) return;
        setApplications(res.applications); setTotalPages(res.totalPages); setTotalCount(res.totalCount);
      })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Failed to load applications'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryFilter, statusFilter, page, appliedSearch, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setAppliedSearch(searchQuery.trim());
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
            Applications
          </h1>
          <p style={{ margin: '6px 0 0', color: '#667085', fontSize: '14px' }}>{totalCount} applications · {statusFilter === 'submitted' ? 'Showing new submissions' : 'Review and assign campaign applicants'}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
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
            placeholder="Name, phone, email, or application number"
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
              setLoading(true);
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
          >
            <option value="all">All Categories</option>
            <option value="volunteer">Volunteers</option>
            <option value="crew">Crew</option>
            <option value="ahibi">Ahibi</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
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
          {error} <button type="button" onClick={() => { setLoading(true); setRefreshKey(key => key + 1); }} style={{ marginLeft: 10 }}>Try again</button>
        </div>
      )}

      {/* Applications Table */}
      <div className="campaign-application-table-wrap" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table className="campaign-application-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Application #</th>
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
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#050f24' }}>
                    {row.application_number}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {row.full_name}
                    <a href={`tel:${row.phone}`} style={{ display: 'inline-block', marginTop: 3, fontSize: '12px', color: '#526071', fontWeight: 400 }}>{row.phone}</a>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#334155' }}>
                    {row.category}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>
                    {campaignRoleLabel(row.preferred_role, row.other_role)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(row.application_status)}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                    {row.assigned_zone ? `${row.assigned_zone} (${row.assigned_shift || 'Shift'})` : <span style={{ color: '#cbd5e1' }}>Unassigned</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {new Date(row.submitted_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
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
            <div className="campaign-application-card-top"><span>{row.application_number}</span>{getStatusBadge(row.application_status)}</div>
            <h2>{row.full_name}</h2>
            <a className="campaign-application-phone" href={`tel:${row.phone}`}>{row.phone}</a>
            <dl>
              <div><dt>Category</dt><dd>{row.category}</dd></div>
              <div><dt>Preferred role</dt><dd>{campaignRoleLabel(row.preferred_role, row.other_role)}</dd></div>
              <div><dt>Assignment</dt><dd>{row.assigned_zone ? `${row.assigned_zone} · ${row.assigned_shift || 'Shift unassigned'}` : 'Not assigned yet'}</dd></div>
              <div><dt>Submitted</dt><dd>{new Date(row.submitted_at).toLocaleDateString()}</dd></div>
            </dl>
            <button className="campaign-primary-button campaign-open-application" type="button" onClick={() => setSelectedAppId(row.id)}>Open application</button>
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
    </div>
  );
};
