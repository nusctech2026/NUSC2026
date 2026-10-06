'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export const ReturnsView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchReturns = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or('fulfillment_status.eq.returned,total_refunded.gt.0')
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) {
        setError(error.message)
      } else {
        setOrders(data || [])
      }
      setLoading(false)
    }

    fetchReturns()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Returns & Refunds</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Orders that have been returned or have a processed refund.
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
                <th style={{ padding: '12px', fontWeight: 600 }}>Order Number</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Total Paid</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Total Refunded</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Fulfillment Status</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No returns or refunds found.
                  </td>
                </tr>
              ) : (
                orders.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.order_number}</td>
                    <td style={{ padding: '12px' }}>{formatCurrency(item.total_amount)}</td>
                    <td style={{ padding: '12px', fontWeight: 500, color: '#991b1b' }}>
                      {formatCurrency(item.total_refunded)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: item.fulfillment_status === 'returned' ? '#f3f4f6' : '#fef3c7', 
                        color: item.fulfillment_status === 'returned' ? '#374151' : '#92400e', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                      }}>
                        {item.fulfillment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{new Date(item.updated_at).toLocaleString()}</td>
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
