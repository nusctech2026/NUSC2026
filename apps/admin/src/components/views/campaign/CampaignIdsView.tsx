'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignPassUrl } from '../../../utils/campaignPassUrl';
import { getIssuedCampaignIds, revokeCampaignId } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

const DEPARTMENT_LABELS: Record<string, string> = {
  ahibi: 'Ahibi', volunteer: 'Volunteers', media: 'Press and Media', crew: 'Crew',
  management: 'Management', officials: 'Match Officials', medical: 'Medical Team',
};

export const CampaignIdsView: React.FC = () => {
  const [ids, setIds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchIds = () => getIssuedCampaignIds(page, 50, activeOnly).then(res => {
    setError(null); setIds(res.ids); setTotalPages(res.totalPages); setTotalCount(res.totalCount);
  }).catch(err => { setError(err instanceof Error ? err.message : 'Failed to load credentials'); })
    .finally(() => setLoading(false));

  useEffect(() => {
    fetchIds();
  }, [activeOnly, page]);

  const handleRevoke = async (idRecordId: string, idNumber: string) => {
    const reason = prompt(`Enter revocation reason for pass ${idNumber}:`, 'Misconduct / Unauthorised area');
    if (!reason) return;

    setActionLoading(true);
    try {
      await revokeCampaignId(idRecordId, reason);
      alert(`Pass ${idNumber} has been revoked.`);
      fetchIds();
    } catch (err: any) {
      alert('Revocation failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="campaign-page" style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <CampaignWorkspaceNav />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e31f2b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Access Control
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#050f24', margin: 0 }}>
            Issued Event IDs & Passes ({totalCount})
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            Active event passes containing secure QR credentials for turnstile scanning.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => { setLoading(true); setActiveOnly(e.target.checked); setPage(1); }}
            />
            Show Active Only
          </label>
          <Link
            href="/admin/campaign/scanner"
            style={{
              background: '#e31f2b',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              textDecoration: 'none',
            }}
          >
            ⚡ Open Scanner
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <table className="campaign-id-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Pass ID #</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Candidate Name</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Assigned Zone / Shift</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Valid Until</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569' }}>Issued By</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  Loading credentials registry...
                </td>
              </tr>
            ) : ids.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No credentials currently issued.
                </td>
              </tr>
            ) : (
              ids.map((row) => {
                const app = row.application;
                const expired = row.isExpired;
                const isPassActive = row.is_active && !row.revoked_at && !expired;
                const passUrl = campaignPassUrl(row.pass_slug);
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#050f24' }}>
                      {row.id_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {app?.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                      {DEPARTMENT_LABELS[app?.category] || app?.category || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#475569' }}>
                      {app?.assigned_zone || 'General'} ({app?.assigned_shift || 'Matchday'})
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {isPassActive ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                          ● Active
                        </span>
                      ) : (
                        <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700 }}>
                          {expired ? 'Expired' : 'Revoked'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {new Date(row.valid_until).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '11px', color: '#64748b' }}>
                      {row.issued_by}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {passUrl && <a
                          href={passUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '5px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            color: '#0f172a',
                          }}
                        >
                          View Pass ↗
                        </a>}
                        {isPassActive && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleRevoke(row.id, row.id_number)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fca5a5',
                              color: '#991b1b',
                              borderRadius: '5px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <nav aria-label="Credential pages" style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        <button type="button" disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" disabled={loading || page >= totalPages} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button>
      </nav>}
    </div>
  );
};
