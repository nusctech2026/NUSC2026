'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export const CategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const fetchCategories = async () => {
      setLoading(true)
      // Since categories can have a hierarchy, let's fetch them with their parent details if possible
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id(name)
        `)
        .order('name', { ascending: true })

      if (error) {
        setError(error.message)
      } else {
        setCategories(data || [])
      }
      setLoading(false)
    }

    fetchCategories()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '1rem', fontWeight: 600 }}>Categories Management</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Organize your products into categories.
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
                <th style={{ padding: '12px', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Slug</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Parent Category</th>
                <th style={{ padding: '12px', fontWeight: 600 }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                    No categories found.
                  </td>
                </tr>
              ) : (
                categories.map((item: any) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.875rem' }}>{item.slug}</td>
                    <td style={{ padding: '12px', color: '#4b5563' }}>
                      {item.parent ? item.parent.name : '—'}
                    </td>
                    <td style={{ padding: '12px', color: '#6b7280', fontSize: '0.875rem' }}>
                      {new Date(item.created_at).toLocaleDateString()}
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
