'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'
import { fulfillOrder } from '../../actions/orders'

export const FulfilmentView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [fulfillingId, setFulfillingId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = getSupabaseBrowserClient()

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('fulfillment_status', ['unfulfilled', 'exception'])
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      setError(error.message)
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fulfillingId || !trackingNumber) return alert('Tracking number is required')
    setSaving(true)
    try {
      await fulfillOrder(fulfillingId, trackingNumber)
      setFulfillingId(null)
      setTrackingNumber('')
      fetchOrders()
    } catch (err: any) {
      alert(`Error fulfilling order: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem' }}>Fulfilment Queue</h1>
      <p style={{ color: 'var(--theme-elevation-500)', marginBottom: '2rem' }}>
        Orders requiring fulfillment or with shipping exceptions.
      </p>
      
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-150)', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)', background: 'var(--theme-elevation-50)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Order Number</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Shipping Address</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>
                    No pending fulfillments.
                  </td>
                </tr>
              ) : (
                orders.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.order_number}</td>
                    <td style={{ padding: '12px 16px' }}>{new Date(item.created_at).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        background: item.fulfillment_status === 'exception' ? '#fee2e2' : '#fef3c7', 
                        color: item.fulfillment_status === 'exception' ? '#991b1b' : '#92400e', 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 
                      }}>
                        {item.fulfillment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {item.shipping_address ? (
                        <div style={{ fontSize: '0.875rem' }}>
                          <div>{item.shipping_address.name}</div>
                          <div>{item.shipping_address.city}, {item.shipping_address.country}</div>
                        </div>
                      ) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {fulfillingId === item.id ? (
                        <form onSubmit={handleFulfill} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <input type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} style={{ width: '150px', padding: '6px', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px' }} placeholder="Tracking Number" required />
                          <button type="submit" disabled={saving} style={{ padding: '6px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{saving ? '...' : 'Fulfill'}</button>
                          <button type="button" onClick={() => setFulfillingId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        </form>
                      ) : (
                        <button onClick={() => { setFulfillingId(item.id); setTrackingNumber(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>Mark Fulfilled</button>
                      )}
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
