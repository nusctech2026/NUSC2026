'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { campaignRoleLabel } from '../../../utils/campaignRoleLabel';
import {
  exportCampaignAttendanceCsv,
  getCampaignAttendanceHistory,
  getCampaignMatches,
  getCampaignRoleOptions,
} from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

export const CampaignAttendanceView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gateFilter, setGateFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [matchFilter, setMatchFilter] = useState('official');
  const [checkpointTypeFilter, setCheckpointTypeFilter] = useState('all');
  const [personInput, setPersonInput] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleOptions, setRoleOptions] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = () => getCampaignAttendanceHistory(
    page, 25, gateFilter, actionFilter, matchFilter, checkpointTypeFilter,
    personFilter, departmentFilter, roleFilter,
  ).then(res => {
    setError(null); setLogs(res.logs || []); setTotalPages(res.totalPages || 1); setTotalCount(res.totalCount || 0);
  }).catch(err => { setError(err instanceof Error ? err.message : 'Failed to load attendance'); })
    .finally(() => setLoading(false));

  useEffect(() => {
    fetchLogs();
  }, [page, gateFilter, actionFilter, matchFilter, checkpointTypeFilter, personFilter, departmentFilter, roleFilter]);
  useEffect(() => { getCampaignMatches(true).then(setMatches).catch(() => setError('Unable to load match filters')); }, []);
  useEffect(() => {
    getCampaignRoleOptions(departmentFilter).then(setRoleOptions).catch(() => setError('Unable to load role filters'));
  }, [departmentFilter]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLoading(true);
    setter(e.target.value);
    setPage(1);
  };

  const applyPersonFilter = () => {
    setLoading(true);
    setPersonFilter(personInput.trim());
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const csv = await exportCampaignAttendanceCsv({
        gate: gateFilter, action: actionFilter, eventId: matchFilter,
        checkpointType: checkpointTypeFilter, person: personFilter,
        department: departmentFilter, roleId: roleFilter,
      });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `nusc-campaign-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export attendance records');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="campaign-page" style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <CampaignWorkspaceNav />
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e31f2b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Event Operations & Gate Logs
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#050f24', margin: 0 }}>
            Gate Scan & Attendance Audit ({totalCount})
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            Real-time audit log of all turnstile scans, admissions, and duplicate entry attempts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => void exportCsv()}
            disabled={exporting}
            style={{ padding: '8px 14px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: exporting ? 'not-allowed' : 'pointer' }}
          >
            {exporting ? 'Preparing CSV…' : 'Export CSV'}
          </button>
          <button
            onClick={() => { setLoading(true); void fetchLogs(); }}
            disabled={loading}
            style={{
              padding: '8px 14px',
              backgroundColor: '#050f24',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🔄 Refresh Logs
          </button>
          <Link
            href="/admin/campaign/scanner"
            style={{
              padding: '8px 14px',
              backgroundColor: '#e31f2b',
              color: '#ffffff',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ⚡ Open Scanner
          </Link>
        </div>
      </div>

      <div><label htmlFor="campaign-attendance-match">Match</label> <select id="campaign-attendance-match" value={matchFilter} onChange={handleFilterChange(setMatchFilter)}>
        <option value="official">All official matches (includes legacy records)</option>
        <option value="test">All TEST matches</option>
        <option value="all">All matches (including TEST)</option>
        {matches.map(match => <option key={match.id} value={match.id}>{match.is_test ? "TEST - " : ""}{match.title}</option>)}
      </select></div>
      {matchFilter === 'test' && <p role="status">TEST attendance is separate from official attendance and is excluded from official totals and exports.</p>}
      {matchFilter === 'all' && <p role="status">Showing official and TEST attendance together. TEST rows are labeled in the report.</p>}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', margin: '12px 0' }}>
        <label htmlFor="campaign-attendance-person">Person</label>
        <input
          id="campaign-attendance-person"
          value={personInput}
          maxLength={100}
          placeholder="Name or registration ID"
          onChange={event => setPersonInput(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') applyPersonFilter(); }}
        />
        <button type="button" onClick={applyPersonFilter}>Search</button>
        {personFilter && <button type="button" onClick={() => { setPersonInput(''); setPersonFilter(''); setPage(1); setLoading(true); }}>Clear person</button>}
      </div>
      {/* Filter Toolbar */}
      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="campaign-attendance-department" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Department:</label>
          <select
            id="campaign-attendance-department"
            value={departmentFilter}
            onChange={event => {
              setLoading(true);
              setDepartmentFilter(event.target.value);
              setRoleFilter('all');
              setPage(1);
            }}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="all">All departments</option>
            <option value="ahibi">AHIBI</option>
            <option value="volunteer">Volunteers</option>
            <option value="media">Press and Media</option>
            <option value="crew">Crew</option>
            <option value="management">Management</option>
            <option value="officials">Match Officials</option>
            <option value="medical">Medical Team</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="campaign-attendance-role" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Role:</label>
          <select
            id="campaign-attendance-role"
            value={roleFilter}
            onChange={handleFilterChange(setRoleFilter)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="all">All roles</option>
            {roleOptions.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Filter Gate:</label>
          <select
            value={gateFilter}
            onChange={handleFilterChange(setGateFilter)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="all">All Gates</option>
            {['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'].map(gate => <option key={gate}>{gate}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="campaign-attendance-checkpoint" style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Checkpoint type:</label>
          <select
            id="campaign-attendance-checkpoint"
            value={checkpointTypeFilter}
            onChange={handleFilterChange(setCheckpointTypeFilter)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="all">All checkpoints</option>
            <option value="gate">Gate</option>
            <option value="booth">Booth</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Filter Action:</label>
          <select
            value={actionFilter}
            onChange={handleFilterChange(setActionFilter)}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff' }}
          >
            <option value="all">All Actions</option>
            <option value="check_in">✅ Check-in (Admitted)</option>
            <option value="duplicate_attempt">⚠️ Duplicate Attempt</option>
            <option value="check_out">🚪 Check-out</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#64748b' }}>
          Showing page {page} of {totalPages}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '13px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {/* Attendance Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <table className="campaign-attendance-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Scan Time</th>
              <th>Match</th>
              <th style={{ padding: '12px 16px' }}>Action</th>
              <th style={{ padding: '12px 16px' }}>Candidate</th>
              <th style={{ padding: '12px 16px' }}>Pass ID</th>
              <th style={{ padding: '12px 16px' }}>Category & Role</th>
              <th style={{ padding: '12px 16px' }}>Gate</th>
              <th style={{ padding: '12px 16px' }}>Scanned By</th>
              <th style={{ padding: '12px 16px' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#596579' }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#596579' }}>
                  No attendance scan logs found matching your filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isCheckIn = log.action === 'check_in';
                const isDuplicate = log.action === 'duplicate_attempt';
                const isCheckOut = log.action === 'check_out';

                const badgeStyle: React.CSSProperties = isCheckIn
                  ? { backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }
                  : isDuplicate
                  ? { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }
                  : { backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };

                const label = isCheckIn ? 'Admitted' : isDuplicate ? 'Duplicate Scan' : 'Check-out';

                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {log.scanned_at ? new Date(log.scanned_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>{log.event?.is_test ? `TEST - ${log.event.title}` : log.event?.title || 'Legacy: match not recorded'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        ...badgeStyle
                      }}>
                        {label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#050f24' }}>
                      {log.application?.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#e31f2b' }}>
                      {log.campaign_id_record?.id_number || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 500, color: '#334155' }}>
                        {log.application?.category}
                      </span>
                      {log.application?.assigned_role?.name && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {campaignRoleLabel(log.application.assigned_role, log.application.other_role)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
                      {log.gate}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontSize: '12px' }}>
                      {log.scanned_by}
                    </td>
                    <td style={{ padding: '12px 16px', color: isDuplicate ? '#b45309' : '#64748b', fontSize: '12px', maxWidth: '240px' }}>
                      {log.notes || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <button
              className="campaign-pagination-button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: page <= 1 ? '#f1f5f9' : '#ffffff',
                color: page <= 1 ? '#596579' : '#334155',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Previous
            </button>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="campaign-pagination-button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #cbd5e1',
                backgroundColor: page >= totalPages ? '#f1f5f9' : '#ffffff',
                color: page >= totalPages ? '#596579' : '#334155',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
