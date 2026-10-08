'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'

export const CouponsView: React.FC = () => {
  const [coupons, setCoupons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fetchCoupons = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        setError(error.message)
      } else {
        setCoupons(data || [])
      }
      setLoading(false)
    }

    fetchCoupons()
  }, [])

  const formatValue = (coupon: any) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.percent_off}% OFF`
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coupon.amount_off / 100) + ' OFF'
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Coupons Management</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        View and manage store discount codes.
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
                <th style={{ padding: '12px', fontWeight: 600 }}>Code</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Value</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Min Order Value</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Usage</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No coupons found.
                  </td>
                </tr>
              ) : (
                coupons.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'monospace', fontSize: '1rem' }}>{item.code}</td>
                    <td style={{ padding: '12px', fontWeight: 500, color: '#166534' }}>
                      {formatValue(item)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {item.min_order_value > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.min_order_value / 100) : 'None'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                      {item.usage_count} / {item.max_uses || '∞'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: item.is_active ? '#dcfce7' : '#f3f4f6', 
                        color: item.is_active ? '#166534' : '#374151', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                      }}>
                        {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
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
