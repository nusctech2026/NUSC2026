'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import { getCampaignApplicationsList } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

export const CampaignApprovedView: React.FC = () => {
  const [approvedList, setApprovedList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApproved = () => getCampaignApplicationsList({ status: 'approved', page, pageSize: 100 }).then(res => {
    setError(null); setApprovedList(res.applications); setTotalPages(res.totalPages); setTotalCount(res.totalCount);
  }).catch(err => { setError(err instanceof Error ? err.message : 'Failed to load approved candidates'); })
    .finally(() => setLoading(false));

  useEffect(() => {
    fetchApproved();
  }, [page]);

  const handleExportCsv = () => {
    window.location.href = '/api/campaign/export-approved';
  };

  return (
    <div className="campaign-page" style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <CampaignWorkspaceNav />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Roster Management
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#050f24', margin: 0 }}>
            Approved Matchday Candidates ({totalCount})
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            Candidates cleared for matchday deployment, zone assignments, and credential issuance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleExportCsv}
            style={{
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📥 Export Approved Roster (CSV)
          </button>
          <Link
            href="/admin/campaign/ids"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '9px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
              color: '#0f172a',
            }}
          >
            Issued Event IDs →
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table className="campaign-roster-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Application #</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Candidate Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Assigned Role</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Assigned Zone</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Assigned Shift</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Phone</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading approved candidates...
                </td>
              </tr>
            ) : approvedList.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No candidates currently in approved status.
                </td>
              </tr>
            ) : (
              approvedList.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#050f24' }}>
                    {row.application_number}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {row.full_name}
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                    {row.category}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#15803d' }}>
                    {campaignRoleLabel(row.assigned_role || row.preferred_role, row.other_role)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.assigned_zone || <span style={{ color: '#94a3b8' }}>Pending zone</span>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.assigned_shift || <span style={{ color: '#94a3b8' }}>Pending shift</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {row.phone}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/admin/campaign/applications?search=${encodeURIComponent(row.application_number)}`}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        color: '#0f172a',
                      }}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <nav aria-label="Approved candidate pages" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        <button type="button" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button>
      </nav>}
    </div>
  );
};
