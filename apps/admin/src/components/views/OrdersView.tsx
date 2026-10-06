'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState<string>('all')

  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter)
      }
      
      if (fulfillmentStatusFilter !== 'all') {
        query = query.eq('fulfillment_status', fulfillmentStatusFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [paymentStatusFilter, fulfillmentStatusFilter])

  // Helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'paid':
      case 'fulfilled':
        return { background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }
      case 'pending':
      case 'unfulfilled':
        return { background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }
      case 'failed':
      case 'cancelled':
      case 'exception':
        return { background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }
      case 'refunded':
      case 'returned':
        return { background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }
      default:
        return { background: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }
    }
  }

  const openOrderModal = async (order: any) => {
    setSelectedOrder(order)
    setLoadingItems(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data, error } = await supabase
        .from('order_items')
        .select('*, product_variants(sku, stock_quantity)')
        .eq('order_id', order.id)
      
      if (error) throw error
      setOrderItems(data || [])
    } catch (err: any) {
      alert(`Error loading items: ${err.message}`)
    } finally {
      setLoadingItems(false)
    }
  }

  const handleFulfill = async () => {
    if (!selectedOrder) return
    const tracking = prompt('Enter tracking number (optional):')
    if (tracking === null) return
    
    setActionLoading(true)
    try {
      const { fulfillOrder } = await import('../../actions/orders')
      await fulfillOrder(selectedOrder.id, tracking)
      fetchOrders()
      setSelectedOrder(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!selectedOrder) return
    const maxRefundable = (selectedOrder.total_amount - selectedOrder.total_refunded) / 100
    if (maxRefundable <= 0) return alert('Order is already fully refunded.')
    
    const amountStr = prompt(`Enter refund amount (Max $${maxRefundable.toFixed(2)}):`)
    if (amountStr === null) return
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0 || amount > maxRefundable) return alert('Invalid amount')

    const reason = prompt('Enter refund reason:') || 'Requested by admin'

    setActionLoading(true)
    try {
      const { refundOrder } = await import('../../actions/orders')
      await refundOrder(selectedOrder.id, Math.round(amount * 100), reason)
      fetchOrders()
      setSelectedOrder(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleReturnItem = async (item: any) => {
    const maxReturnable = item.quantity - item.quantity_returned
    if (maxReturnable <= 0) return alert('Item fully returned already.')
    
    const qtyStr = prompt(`Enter quantity to return (Max ${maxReturnable}):`)
    if (qtyStr === null) return
    const qty = parseInt(qtyStr, 10)
    if (isNaN(qty) || qty <= 0 || qty > maxReturnable) return alert('Invalid quantity')

    setActionLoading(true)
    try {
      const { processReturn } = await import('../../actions/orders')
      await processReturn(selectedOrder.id, item.id, qty, item.variant_id)
      openOrderModal(selectedOrder) // reload items
      fetchOrders()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>Orders</h1>
        <button 
          onClick={fetchOrders}
          style={{ padding: '8px 16px', background: 'var(--theme-elevation-150)', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--theme-elevation-50)', borderRadius: '8px', border: '1px solid var(--theme-elevation-150)' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Payment Status</label>
          <select 
            value={paymentStatusFilter} 
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-0)', minWidth: '150px' }}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 600 }}>Fulfillment Status</label>
          <select 
            value={fulfillmentStatusFilter} 
            onChange={(e) => setFulfillmentStatusFilter(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-0)', minWidth: '150px' }}
          >
            <option value="all">All</option>
            <option value="unfulfilled">Unfulfilled</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
            <option value="exception">Exception</option>
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f87171' }}>
          Error loading orders: {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--theme-elevation-400)' }}>
          Loading orders...
        </div>
      ) : !error && (
        <div style={{ background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-150)', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)', background: 'var(--theme-elevation-50)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Order ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Customer / Email</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Payment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Fulfillment</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--theme-elevation-400)' }}>
                      No orders found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  orders.map((order: any) => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                        <div style={{ fontWeight: 600 }}>{order.order_number}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)' }}>{order.id.split('-')[0]}...</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{order.user_email_snapshot}</div>
                        {order.user_id && <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)', fontFamily: 'monospace' }}>ID: {order.user_id.split('-')[0]}...</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {new Date(order.created_at).toLocaleDateString()}
                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)' }}>
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={getStatusBadgeStyle(order.payment_status)}>{order.payment_status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={getStatusBadgeStyle(order.fulfillment_status)}>{order.fulfillment_status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button onClick={() => openOrderModal(order)} style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--theme-elevation-0)', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Order {selectedOrder.order_number}</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Customer Details</h3>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Email:</strong> {selectedOrder.user_email_snapshot}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Status:</strong> <span style={getStatusBadgeStyle(selectedOrder.payment_status)}>{selectedOrder.payment_status.toUpperCase()}</span> / <span style={getStatusBadgeStyle(selectedOrder.fulfillment_status)}>{selectedOrder.fulfillment_status.toUpperCase()}</span></p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Total:</strong> {formatCurrency(selectedOrder.total_amount)}</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Refunded:</strong> {formatCurrency(selectedOrder.total_refunded)}</p>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', visibility: 'hidden' }}>Actions</h3>
                {selectedOrder.fulfillment_status === 'unfulfilled' && (
                  <>
                    <button onClick={handleFulfill} disabled={actionLoading} style={{ padding: '8px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
                      {actionLoading ? 'Processing...' : 'Mark as Fulfilled'}
                    </button>
                    <button onClick={async () => {
                      const reason = prompt('Reason for cancellation:')
                      if (!reason) return
                      setActionLoading(true)
                      try {
                        const { cancelOrder } = await import('../../actions/orders')
                        await cancelOrder(selectedOrder.id, reason)
                        fetchOrders()
                        setSelectedOrder(null)
                      } catch (err: any) {
                        alert(err.message)
                      } finally {
                        setActionLoading(false)
                      }
                    }} disabled={actionLoading} style={{ padding: '8px', background: 'transparent', color: '#991b1b', border: '1px solid #991b1b', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
                      {actionLoading ? 'Processing...' : 'Cancel Order'}
                    </button>
                  </>
                )}
                {selectedOrder.payment_status !== 'refunded' && selectedOrder.payment_status !== 'cancelled' && selectedOrder.total_refunded < selectedOrder.total_amount && (
                  <button onClick={handleRefund} disabled={actionLoading} style={{ padding: '8px', background: 'transparent', color: '#991b1b', border: '1px solid #991b1b', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
                    {actionLoading ? 'Processing...' : 'Issue Refund'}
                  </button>
                )}
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Order Items</h3>
            {loadingItems ? (
              <p>Loading items...</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Returned</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 600 }}>{item.product_name_snapshot}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)' }}>SKU: {item.product_variants?.sku || 'N/A'}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(item.price_at_purchase)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: item.quantity_returned > 0 ? '#991b1b' : 'inherit' }}>
                        {item.quantity_returned}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {item.quantity_returned < item.quantity && selectedOrder.fulfillment_status === 'fulfilled' && (
                           <button onClick={() => handleReturnItem(item)} disabled={actionLoading} style={{ padding: '4px 8px', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>
                             Return
                           </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
