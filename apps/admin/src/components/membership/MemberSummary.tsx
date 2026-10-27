'use client'

import React, { useCallback, useEffect, useState } from 'react'

type MemberStats = {
  total: number
  active: number
  registrationPending: number
  riseGeneralActive: number
  risePremiumActive: number
}

const cards: { key: keyof MemberStats; label: string; color: string; background: string; border: string }[] = [
  { key: 'total', label: 'Total member records', color: '#0f172a', background: '#ffffff', border: '#e2e8f0' },
  { key: 'active', label: 'Active memberships', color: '#166534', background: '#f0fdf4', border: '#bbf7d0' },
  { key: 'registrationPending', label: '₹10 registration fee pending', color: '#9a3412', background: '#fff7ed', border: '#fed7aa' },
  { key: 'riseGeneralActive', label: 'Active Rise General', color: '#1e3a8a', background: '#eff6ff', border: '#bfdbfe' },
  { key: 'risePremiumActive', label: 'Active Rise Premium', color: '#3730a3', background: '#eef2ff', border: '#c7d2fe' },
]

export function MemberSummary() {
  const [stats, setStats] = useState<MemberStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/members/stats', { cache: 'no-store' })
      if (!response.ok) throw new Error('Member stats request failed')
      const data = (await response.json()) as MemberStats
      if (Object.values(data).some((value) => !Number.isFinite(value))) {
        throw new Error('Member stats response is invalid')
      }
      setStats(data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  return (
    <section aria-label="Membership summary" style={{ margin: '16px 10px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#172238' }}>Membership Overview</h3>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#667085' }}>
          Current member records, payment status, and active Rise tiers.
        </p>
      </div>

      {loading && <p role="status" style={{ margin: 0, color: '#667085' }}>Loading membership counts…</p>}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#b42318' }}>
          <span>Could not load membership counts.</span>
          <button type="button" onClick={() => void loadStats()}>Retry</button>
        </div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {cards.map(({ key, label, color, background, border }) => (
            <div key={key} style={{ padding: 16, borderRadius: 8, border: `1px solid ${border}`, background, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 28, lineHeight: 1.2, fontWeight: 800, color, marginTop: 5 }}>
                {stats[key].toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
