'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { adjustInventory } from '../../actions/inventory'

export const InventoryView: React.FC = () => {
  const [variants, setVariants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [adjustingId, setAdjustingId] = useState<string | null>(null)
  const [delta, setDelta] = useState<number>(0)
  const [reason, setReason] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const fetchVariants = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('product_variants')
      .select('*, products(name, is_archived)')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setVariants(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVariants()
  }, [])

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustingId || !reason) return alert('Reason is required')
    setSaving(true)
    try {
      await adjustInventory(adjustingId, delta, reason)
      setAdjustingId(null)
      setDelta(0)
      setReason('')
      fetchVariants()
    } catch (err: any) {
      alert(`Error adjusting inventory: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '2rem' }}>Inventory Adjustments</h1>
      
      {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f87171' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading inventory...</div>
      ) : (
        <div style={{ background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-150)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)', background: 'var(--theme-elevation-50)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Product</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>SKU</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Stock Qty</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }}>No variants found.</td></tr>
              ) : (
                variants.map((v: any) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{v.products?.name}</div>
                      {v.products?.is_archived && <span style={{ fontSize: '0.7rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>Archived</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{v.sku}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: v.stock_quantity <= 5 ? '#991b1b' : 'inherit' }}>{v.stock_quantity}</span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {adjustingId === v.id ? (
                        <form onSubmit={handleAdjust} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <input type="number" value={delta} onChange={e => setDelta(parseInt(e.target.value) || 0)} style={{ width: '80px', padding: '6px', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px' }} placeholder="Delta" required />
                          <input type="text" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '120px', padding: '6px', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px' }} placeholder="Reason" required />
                          <button type="submit" disabled={saving} style={{ padding: '6px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{saving ? '...' : 'Save'}</button>
                          <button type="button" onClick={() => setAdjustingId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        </form>
                      ) : (
                        <button onClick={() => { setAdjustingId(v.id); setDelta(0); setReason(''); }} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer' }}>Adjust Stock</button>
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
