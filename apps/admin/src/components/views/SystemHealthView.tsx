'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'

export const SystemHealthView: React.FC = () => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fetchData = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .limit(50)

      if (error) {
        setError(error.message)
      } else {
        setData(data || [])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem' }}>SystemHealth Management</h1>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ padding: '12px', textAlign: 'center', color: '#6b7280' }}>
                    No records found
                  </td>
                </tr>
              ) : (
                data.map((item: any) => (
                  <tr key={item.id || item.created_at || Math.random()} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace' }}>{item.id || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
