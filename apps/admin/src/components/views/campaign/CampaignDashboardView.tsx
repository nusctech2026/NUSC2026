'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@payloadcms/ui';
import { getAdminCampaignStats } from '../../../actions/campaignAdminActions';
import { CampaignWorkspaceNav } from '../../nav/CampaignWorkspaceNav';

export const CampaignDashboardView: React.FC = () => {
  const { user } = useAuth();
  const roles = (user as any)?.roles || (user as any)?.display_roles?.map((item: any) => item.role) || [];
  const canManage = roles.includes('super_admin') || roles.includes('campaign_manager');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminCampaignStats();
        if (active) setStats(data);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load campaign statistics');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadStats();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="campaign-page" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <CampaignWorkspaceNav />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#e31f2b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
            Nagaland United SC
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#050f24', margin: 0 }}>
            Workforce Operations Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0' }}>
            Matchday event staffing, volunteer recruitment, credentialing, and gate access control.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {canManage && <Link href="/admin/campaign/matches">Manage matches</Link>}
          {canManage && <Link
            href="/admin/campaign/scanner"
            style={{
              background: '#e31f2b',
              color: '#fff',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            ⚡ Open Gate Scanner
          </Link>}
          <Link
            href="/admin/campaign/applications"
            style={{
              background: '#fff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Review Applications →
          </Link>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading live campaign analytics...
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}

      {stats && (
        <>
          {/* Main Status KPI Grid */}
          <div className="campaign-dashboard-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '2rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Registered</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#050f24', margin: '6px 0 2px' }}>{stats.total_applications || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Across all categories</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', textTransform: 'uppercase' }}>Submitted</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0369a1', margin: '6px 0 2px' }}>{stats.submitted || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Awaiting initial review</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #d97706', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>Under Review</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#b45309', margin: '6px 0 2px' }}>{stats.under_review || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Vetting in progress</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>Approved</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', margin: '6px 0 2px' }}>{stats.approved || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Event pass eligible</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #9333ea', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#9333ea', textTransform: 'uppercase' }}>Waitlisted</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#7e22ce', margin: '6px 0 2px' }}>{stats.waitlisted || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Standby pool</div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>Rejected</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#991b1b', margin: '6px 0 2px' }}>{stats.rejected || 0}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Declined applications</div>
            </div>
          </div>

          {/* Category Distribution Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '2.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#050f24', marginBottom: '16px' }}>
                Registration by Department Track
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    <span>🤝 Volunteers ({stats.volunteer_count || 0})</span>
                    <span>
                      {stats.total_applications > 0
                        ? Math.round(((stats.volunteer_count || 0) / stats.total_applications) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: '#e31f2b',
                        height: '100%',
                        width: `${stats.total_applications > 0 ? ((stats.volunteer_count || 0) / stats.total_applications) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    <span>⚡ Production Crew ({stats.crew_count || 0})</span>
                    <span>
                      {stats.total_applications > 0
                        ? Math.round(((stats.crew_count || 0) / stats.total_applications) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: '#0c2249',
                        height: '100%',
                        width: `${stats.total_applications > 0 ? ((stats.crew_count || 0) / stats.total_applications) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                    <span>🎟️ Ahibi Ticketing ({stats.ahibi_count || 0})</span>
                    <span>
                      {stats.total_applications > 0
                        ? Math.round(((stats.ahibi_count || 0) / stats.total_applications) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div style={{ background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        background: '#e9b949',
                        height: '100%',
                        width: `${stats.total_applications > 0 ? ((stats.ahibi_count || 0) / stats.total_applications) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#050f24', marginBottom: '16px' }}>
                Other Departments
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                {[
                  ['Press and Media', stats.media_count],
                  ['Management', stats.management_count],
                  ['Match Officials', stats.officials_count],
                  ['Medical Team', stats.medical_count],
                ].map(([label, count]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                    <span style={{ color: '#475569' }}>{label}</span>
                    <strong style={{ color: '#050f24' }}>{Number(count) || 0}</strong>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#92400e', margin: '16px 0 0' }}>
                Possible duplicate registrations flagged for review: {stats.potential_duplicate_count || 0}
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#050f24', marginBottom: '16px' }}>
                Operational Workflows
              </h2>
              <div className="campaign-dashboard-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Link
                  href="/admin/campaign/applications?status=submitted"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Triage Inbox</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Review pending submissions</div>
                </Link>

                <Link
                  href="/admin/campaign/approved"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#15803d' }}>Approved Staff</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Export rosters & badges</div>
                </Link>

                <Link
                  href="/admin/campaign/ids"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Issued Event IDs</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Revoke or re-issue passes</div>
                </Link>

                <Link
                  href="/admin/campaign/attendance"
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '14px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Turnstile Audit</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Gate scans & duplicates</div>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
