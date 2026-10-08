'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'

export const PaymentsView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const fetchPayments = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('payments')
        .select('*, orders(order_number)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        setError(error.message)
      } else {
        setPayments(data || [])
      }
      setLoading(false)
    }

    fetchPayments()
  }, [])

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Payments Ledger</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Read-only view of all payment transactions and statuses.
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
                <th style={{ padding: '12px', fontWeight: 600 }}>Payment ID</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Order #</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Provider</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontSize: '0.875rem' }}>{item.provider_payment_id || item.id}</td>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.orders?.order_number || 'N/A'}</td>
                    <td style={{ padding: '12px', textTransform: 'capitalize' }}>{item.provider}</td>
                    <td style={{ padding: '12px', fontWeight: 500 }}>
                      {formatCurrency(item.amount, item.currency)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        background: item.status === 'succeeded' ? '#dcfce7' : item.status === 'failed' ? '#fee2e2' : item.status === 'refunded' ? '#f3f4f6' : '#fef3c7', 
                        color: item.status === 'succeeded' ? '#166534' : item.status === 'failed' ? '#991b1b' : item.status === 'refunded' ? '#374151' : '#92400e', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                      }}>
                        {item.status.toUpperCase()}
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
