'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'

export const StaffView: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fetchStaff = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        setError(error.message)
      } else {
        setStaff(data || [])
      }
      setLoading(false)
    }

    fetchStaff()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Staff & Roles</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        View system administrators and their operational roles.
      </p>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '12px', fontWeight: 600 }}>User ID (Supabase Auth)</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Granted At</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No staff records found.
                  </td>
                </tr>
              ) : (
                staff.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '0.875rem', fontFamily: 'monospace' }}>{item.user_id}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: '#dbeafe', 
                        color: '#1e40af', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                      }}>
                        {item.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>{new Date(item.created_at).toLocaleString()}</td>
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
