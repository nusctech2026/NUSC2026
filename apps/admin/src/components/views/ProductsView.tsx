'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '../../utils/supabaseBrowserClient'
import { createProduct, updateProduct, archiveProduct, createVariant, updateVariant, addProductImage, removeProductImage } from '../../actions/products'

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('details')
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  
  // Product Data
  const [formData, setFormData] = useState({
    name: '', slug: '', description: '', seo_title: '', seo_description: '', 
    category_id: '', tax_rate: 0, is_tax_inclusive: true, base_price: 0, is_featured: false
  })
  
  // Nested Data
  const [variants, setVariants] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [loadingNested, setLoadingNested] = useState(false)

  const [saving, setSaving] = useState(false)

  const supabase = getSupabaseBrowserClient()

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (statusFilter === 'active') {
        query = query.eq('is_archived', false)
      } else if (statusFilter === 'archived') {
        query = query.eq('is_archived', true)
      }
      
      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setProducts(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name')
    if (data) setCategories(data)
  }

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [statusFilter, searchQuery])

  const fetchNestedData = async (productId: string) => {
    setLoadingNested(true)
    const [{ data: vData }, { data: iData }] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', productId).order('created_at'),
      supabase.from('product_images').select('*').eq('product_id', productId).order('display_order')
    ])
    setVariants(vData || [])
    setImages(iData || [])
    setLoadingNested(false)
  }

  const openModal = (product?: any) => {
    setActiveTab('details')
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        description: product.description || '',
        seo_title: product.seo_title || '',
        seo_description: product.seo_description || '',
        category_id: product.category_id || '',
        tax_rate: product.tax_rate || 0,
        is_tax_inclusive: product.is_tax_inclusive !== false,
        base_price: product.base_price ? product.base_price / 100 : 0,
        is_featured: product.is_featured || false
      })
      fetchNestedData(product.id)
    } else {
      setEditingProduct(null)
      setVariants([])
      setImages([])
      setFormData({
        name: '', slug: '', description: '', seo_title: '', seo_description: '', 
        category_id: '', tax_rate: 0, is_tax_inclusive: true, base_price: 0, is_featured: false
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = { ...formData, base_price: Math.round(formData.base_price * 100) }
      if (!payload.category_id) delete (payload as any).category_id

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload)
      }
      setIsModalOpen(false)
      fetchProducts()
    } catch (err: any) {
      alert(`Error saving product: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleArchive = async (id: string, currentlyArchived: boolean) => {
    if (!confirm(`Are you sure you want to ${currentlyArchived ? 'restore' : 'archive'} this product?`)) return
    try {
      await archiveProduct(id, !currentlyArchived)
      fetchProducts()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>Products</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={fetchProducts} style={btnStyle('var(--theme-elevation-150)')}>Refresh</button>
          <button onClick={() => openModal()} style={btnStyle('#000', '#fff')}>+ Create Product</button>
        </div>
      </div>
      
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--theme-elevation-50)', borderRadius: '8px', border: '1px solid var(--theme-elevation-150)' }}>
        <div style={{ flex: 1 }}>
          <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading products...</div>
      ) : (
        <div style={{ background: 'var(--theme-elevation-0)', border: '1px solid var(--theme-elevation-150)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)', background: 'var(--theme-elevation-50)' }}>
                <th style={thStyle}>Product Name</th>
                <th style={thStyle}>Category</th>
                <th style={{...thStyle, textAlign: 'right'}}>Base Price</th>
                <th style={{...thStyle, textAlign: 'center'}}>Status</th>
                <th style={{...thStyle, textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No products found.</td></tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--theme-elevation-400)' }}>/{p.slug}</div>
                    </td>
                    <td style={tdStyle}>{p.categories?.name || 'Uncategorized'}</td>
                    <td style={{...tdStyle, textAlign: 'right', fontWeight: 600}}>${(p.base_price / 100).toFixed(2)}</td>
                    <td style={{...tdStyle, textAlign: 'center'}}>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: p.is_archived ? '#f3f4f6' : '#dcfce7', color: p.is_archived ? '#374151' : '#166534' }}>
                        {p.is_archived ? 'Archived' : 'Active'}
                      </span>
                      {p.is_featured && <span style={{ marginLeft: '4px', background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Featured</span>}
                    </td>
                    <td style={{...tdStyle, textAlign: 'right'}}>
                      <button onClick={() => openModal(p)} style={btnStyle()}>Edit</button>
                      <button onClick={() => handleToggleArchive(p.id, p.is_archived)} style={{...btnStyle(), marginLeft: '0.5rem', color: p.is_archived ? '#166534' : '#991b1b'}}>
                        {p.is_archived ? 'Restore' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--theme-elevation-0)', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>{editingProduct ? 'Edit Product' : 'Create Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {editingProduct && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--theme-elevation-150)' }}>
                {['details', 'variants', 'images'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ 
                    background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', textTransform: 'capitalize', fontWeight: 600,
                    borderBottom: activeTab === tab ? '2px solid #000' : '2px solid transparent',
                    color: activeTab === tab ? '#000' : 'var(--theme-elevation-400)'
                  }}>
                    {tab}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'details' && (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Name *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Slug *</label>
                    <input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Category</label>
                  <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} style={inputStyle}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={inputStyle} />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Base Price (USD) *</label>
                    <input type="number" step="0.01" min="0" required value={formData.base_price} onChange={e => setFormData({...formData, base_price: parseFloat(e.target.value)})} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Tax Rate (%)</label>
                    <input type="number" step="0.01" min="0" value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: parseFloat(e.target.value)})} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={formData.is_tax_inclusive} onChange={e => setFormData({...formData, is_tax_inclusive: e.target.checked})} />
                    Tax Inclusive
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" checked={formData.is_featured} onChange={e => setFormData({...formData, is_featured: e.target.checked})} />
                    Featured Product
                  </label>
                </div>

                <hr style={{ margin: '1rem 0', borderColor: 'var(--theme-elevation-150)' }} />
                
                <h3 style={{ margin: 0, fontSize: '1rem' }}>SEO Metadata</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>SEO Title</label>
                    <input value={formData.seo_title} onChange={e => setFormData({...formData, seo_title: e.target.value})} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>SEO Description</label>
                    <input value={formData.seo_description} onChange={e => setFormData({...formData, seo_description: e.target.value})} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={btnStyle()} disabled={saving}>Cancel</button>
                  <button type="submit" style={btnStyle('#000', '#fff')} disabled={saving}>{saving ? 'Saving...' : 'Save Product'}</button>
                </div>
              </form>
            )}

            {activeTab === 'variants' && editingProduct && (
              <VariantsManager 
                productId={editingProduct.id} 
                variants={variants} 
                onRefresh={() => fetchNestedData(editingProduct.id)} 
              />
            )}

            {activeTab === 'images' && editingProduct && (
              <ImagesManager 
                productId={editingProduct.id} 
                images={images} 
                onRefresh={() => fetchNestedData(editingProduct.id)} 
              />
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// Subcomponents for Variants and Images
const VariantsManager = ({ productId, variants, onRefresh }: { productId: string, variants: any[], onRefresh: () => void }) => {
  const [newSku, setNewSku] = useState('')
  const [newStock, setNewStock] = useState(0)
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createVariant({ product_id: productId, sku: newSku, stock_quantity: newStock })
      setNewSku(''); setNewStock(0);
      onRefresh()
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  const handleUpdateStock = async (id: string, currentStock: number) => {
    const newQty = prompt('Enter new stock quantity:', currentStock.toString())
    if (newQty === null) return
    const qty = parseInt(newQty, 10)
    if (isNaN(qty) || qty < 0) return alert('Invalid quantity')
    
    try {
      await updateVariant(id, { stock_quantity: qty })
      onRefresh()
    } catch(err:any) { alert(err.message) }
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>SKU *</label>
          <input required value={newSku} onChange={e=>setNewSku(e.target.value)} style={inputStyle} placeholder="e.g. TSHIRT-M-RED" />
        </div>
        <div style={{ width: '120px' }}>
          <label style={labelStyle}>Initial Stock *</label>
          <input type="number" min="0" required value={newStock} onChange={e=>setNewStock(parseInt(e.target.value)||0)} style={inputStyle} />
        </div>
        <button type="submit" disabled={loading} style={{...btnStyle('#000','#fff'), height: '38px'}}>+ Add Variant</button>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
            <th style={thStyle}>SKU</th>
            <th style={thStyle}>Options</th>
            <th style={thStyle}>Stock</th>
            <th style={{...thStyle, textAlign:'right'}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {variants.length === 0 ? <tr><td colSpan={4} style={{padding: '1rem', textAlign:'center'}}>No variants added.</td></tr> : null}
          {variants.map(v => (
            <tr key={v.id} style={{ borderBottom: '1px solid var(--theme-elevation-100)' }}>
              <td style={tdStyle}>{v.sku}</td>
              <td style={tdStyle}>{v.options ? JSON.stringify(v.options) : 'N/A'}</td>
              <td style={tdStyle}>
                <span style={{ fontWeight: 600, color: v.stock_quantity === 0 ? '#991b1b' : 'inherit' }}>{v.stock_quantity}</span>
              </td>
              <td style={{...tdStyle, textAlign:'right'}}>
                <button onClick={() => handleUpdateStock(v.id, v.stock_quantity)} style={btnStyle()}>Update Stock</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ImagesManager = ({ productId, images, onRefresh }: { productId: string, images: any[], onRefresh: () => void }) => {
  const [newPath, setNewPath] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await addProductImage(productId, newPath)
      setNewPath('');
      onRefresh()
    } catch (err: any) { alert(err.message) }
    finally { setLoading(false) }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this image?')) return
    try {
      await removeProductImage(id)
      onRefresh()
    } catch(err:any) { alert(err.message) }
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Image Storage Path / URL *</label>
          <input required value={newPath} onChange={e=>setNewPath(e.target.value)} style={inputStyle} placeholder="e.g. /products/shirt1.jpg" />
        </div>
        <button type="submit" disabled={loading} style={{...btnStyle('#000','#fff'), height: '38px'}}>+ Add Image</button>
      </form>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
        {images.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem' }}>No images added.</p>}
        {images.map(img => (
          <div key={img.id} style={{ border: '1px solid var(--theme-elevation-200)', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
            <div style={{ width: '100%', height: '120px', background: 'var(--theme-elevation-50)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={img.storage_path} alt={img.alt_text || 'Product image'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', marginBottom: '0.5rem' }}>{img.storage_path}</div>
            <button onClick={() => handleRemove(img.id)} style={{...btnStyle(), color: '#991b1b', width: '100%'}}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Styling helpers
const btnStyle = (bg = 'transparent', color = 'inherit') => ({ padding: '6px 12px', background: bg, color, border: '1px solid var(--theme-elevation-200)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' })
const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-0)', width: '100%' }
const labelStyle = { display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 600, color: 'var(--theme-elevation-500)' }
const thStyle = { padding: '12px 16px', fontWeight: 600 }
const tdStyle = { padding: '12px 16px' }
const errorStyle = { background: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #f87171' }
