'use client';

import React, { useCallback, useEffect, useState } from 'react';

type DemandStats = {
  total: number;
  officialCount: number;
  awayCount: number;
  reserveCount: number;
  sizes: Record<string, number>;
  sizeBreakdown: Record<string, { official: number; away: number; reserve: number }>;
};

const JERSEY_SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'] as const;

export const JerseyDemandSummary: React.FC = () => {
  const [stats, setStats] = useState<DemandStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch('/api/jersey-interest-registrations/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('Stats request failed');
      const data = (await response.json()) as DemandStats;
      if (
        !Number.isFinite(data.total) ||
        !Number.isFinite(data.officialCount) ||
        !Number.isFinite(data.awayCount) ||
        !Number.isFinite(data.reserveCount)
      ) {
        throw new Error('Stats response is invalid');
      }
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleExport = () => {
    window.location.href = '/api/jersey-interest-registrations/export-csv';
  };

  const totalVotes = stats ? stats.officialCount + stats.awayCount + stats.reserveCount : 0;
  const officialPct = totalVotes > 0 && stats ? Math.round((stats.officialCount / totalVotes) * 100) : 0;
  const awayPct = totalVotes > 0 && stats ? Math.round((stats.awayCount / totalVotes) * 100) : 0;
  const reservePct = totalVotes > 0 && stats ? Math.round((stats.reserveCount / totalVotes) * 100) : 0;
  const sizeRows = stats
    ? JERSEY_SIZE_ORDER.map((size) => {
        const counts = stats.sizeBreakdown[size] ?? { official: 0, away: 0, reserve: 0 };
        return { size, ...counts, total: counts.official + counts.away + counts.reserve };
      })
    : [];
  const sizeTotals = sizeRows.reduce(
    (totals, row) => ({
      official: totals.official + row.official,
      away: totals.away + row.away,
      reserve: totals.reserve + row.reserve,
      total: totals.total + row.total,
    }),
    { official: 0, away: 0, reserve: 0, total: 0 },
  );

  // Determine top kit
  let topKit = 'Official Kit';
  let topCount = stats?.officialCount || 0;
  if (stats && stats.awayCount > topCount) {
    topKit = 'Away Kit';
    topCount = stats.awayCount;
  }
  if (stats && stats.reserveCount > topCount) {
    topKit = 'Reserve Kit';
    topCount = stats.reserveCount;
  }

  return (
    <div style={{ margin: '16px 10px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#172238' }}>
            Kit Pre-Order Demand Intelligence
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#667085' }}>
            Real-time fan preferences across Official, Away, and Reserve kits.
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            padding: '9px 18px',
            backgroundColor: '#101e35',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d335a')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#101e35')}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Supporters CSV
        </button>
      </div>

      {loading && <p role="status" style={{ margin: 0, color: '#667085' }}>Loading supporter counts…</p>}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#b42318' }}>
          <span>Could not load jersey supporter counts.</span>
          <button type="button" onClick={() => void loadStats()}>Retry</button>
        </div>
      )}

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Total Fans Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Supporter Signups
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
              {topCount > 0 ? `Leader: ${topKit}` : 'Awaiting preferences'}
            </div>
          </div>

          {/* Official Kit Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                Official Kit
              </span>
              <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: '12px', fontWeight: 600 }}>
                {officialPct}%
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e3a8a', margin: '4px 0' }}>
              {stats.officialCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>fans</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${officialPct}%`, height: '100%', background: '#2563eb' }} />
            </div>
          </div>

          {/* Away Kit Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              background: 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
                Away Kit
              </span>
              <span style={{ fontSize: '11px', background: '#fee2e2', color: '#991b1b', padding: '2px 7px', borderRadius: '12px', fontWeight: 600 }}>
                {awayPct}%
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#881337', margin: '4px 0' }}>
              {stats.awayCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>fans</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${awayPct}%`, height: '100%', background: '#e11d48' }} />
            </div>
          </div>

          {/* Reserve Kit Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                Reserve Kit
              </span>
              <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: '12px', fontWeight: 600 }}>
                {reservePct}%
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0c4a6e', margin: '4px 0' }}>
              {stats.reserveCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>fans</span>
            </div>
            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${reservePct}%`, height: '100%', background: '#0284c7' }} />
            </div>
          </div>
        </div>
      )}

      {stats && (
        <section
          aria-labelledby="jersey-size-demand-heading"
          style={{
            alignSelf: 'flex-start',
            width: '100%',
            maxWidth: '760px',
            border: '1px solid #d9e1eb',
            borderRadius: '6px',
            background: '#ffffff',
            overflow: 'hidden',
            color: '#172238',
          }}
        >
          <div style={{ padding: '10px 14px 8px' }}>
            <h4 id="jersey-size-demand-heading" style={{ margin: 0, color: '#172238', fontSize: '15px', lineHeight: 1.25, fontWeight: 700 }}>
              Kit interest by size
            </h4>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: '440px',
                borderCollapse: 'collapse',
                textAlign: 'center',
                color: '#172238',
                fontSize: '12px',
                lineHeight: 1.25,
              }}
            >
              <thead>
                <tr style={{ background: '#edf1f6', color: '#344054' }}>
                  {['Size', 'Official', 'Away', 'Reserve', 'Total Demand'].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      style={{ padding: '7px 10px', color: '#344054', fontSize: '11px', lineHeight: 1.25, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row, index) => (
                  <tr key={row.size} style={{ background: index % 2 === 0 ? '#ffffff' : '#f4f6f9' }}>
                    <th
                      scope="row"
                      style={{ padding: '4px 10px', borderBottom: '1px solid #e5eaf0', color: '#172238', lineHeight: 1.25, fontWeight: 600 }}
                    >
                      {row.size}
                    </th>
                    {[row.official, row.away, row.reserve, row.total].map((count, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{ padding: '4px 10px', borderBottom: '1px solid #e5eaf0', color: '#172238', lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {count}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#edf1f6', color: '#172238', fontWeight: 700 }}>
                  <th scope="row" style={{ padding: '6px 10px', borderTop: '1px solid #c7d0dc', color: '#172238', lineHeight: 1.25 }}>
                    Total
                  </th>
                  {[sizeTotals.official, sizeTotals.away, sizeTotals.reserve, sizeTotals.total].map((count, cellIndex) => (
                    <td key={cellIndex} style={{ padding: '6px 10px', borderTop: '1px solid #c7d0dc', color: '#172238', lineHeight: 1.25, fontVariantNumeric: 'tabular-nums' }}>
                      {count}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
