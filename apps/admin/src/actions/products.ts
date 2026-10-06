'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logAudit } from './audit'

function getSupabase() {
  return async () => {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
        },
      }
    )
  }
}

export async function createProduct(data: {
  name: string,
  slug: string,
  description?: string,
  seo_title?: string,
  seo_description?: string,
  category_id?: string,
  tax_rate?: number,
  is_tax_inclusive?: boolean,
  base_price: number,
  is_featured?: boolean
}) {
  const getClient = getSupabase()
  const supabase = await getClient()

  // Input validation (basic)
  if (!data.name || !data.slug || typeof data.base_price !== 'number') {
    throw new Error('Missing required product fields')
  }

  const { data: inserted, error } = await supabase
    .from('products')
    .insert([data])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('create', 'products', inserted.id, null, inserted)
  return inserted
}

export async function updateProduct(id: string, data: Partial<{
  name: string,
  slug: string,
  description: string,
  seo_title: string,
  seo_description: string,
  category_id: string,
  tax_rate: number,
  is_tax_inclusive: boolean,
  base_price: number,
  is_featured: boolean
}>) {
  const getClient = getSupabase()
  const supabase = await getClient()

  // Get old data for audit
  const { data: oldData } = await supabase.from('products').select('*').eq('id', id).single()

  const { data: updated, error } = await supabase
    .from('products')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('update', 'products', id, oldData, updated)
  return updated
}

export async function archiveProduct(id: string, archive: boolean = true) {
  const getClient = getSupabase()
  const supabase = await getClient()

  const { data: updated, error } = await supabase
    .from('products')
    .update({ is_archived: archive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit(archive ? 'archive' : 'restore', 'products', id, null, updated)
  return updated
}

// Variant Management
export async function createVariant(data: {
  product_id: string,
  sku: string,
  options?: any,
  price_override?: number,
  stock_quantity: number
}) {
  const getClient = getSupabase()
  const supabase = await getClient()

  const { data: inserted, error } = await supabase
    .from('product_variants')
    .insert([data])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('create_variant', 'product_variants', inserted.id, null, inserted)
  return inserted
}

export async function updateVariant(id: string, data: Partial<{
  sku: string,
  options: any,
  price_override: number,
  stock_quantity: number
}>) {
  const getClient = getSupabase()
  const supabase = await getClient()

  const { data: oldData } = await supabase.from('product_variants').select('*').eq('id', id).single()

  const { data: updated, error } = await supabase
    .from('product_variants')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('update_variant', 'product_variants', id, oldData, updated)
  return updated
}

// Images Management
export async function addProductImage(product_id: string, storage_path: string, alt_text?: string, display_order?: number) {
  const getClient = getSupabase()
  const supabase = await getClient()

  const { data: inserted, error } = await supabase
    .from('product_images')
    .insert([{ product_id, storage_path, alt_text, display_order: display_order || 0 }])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('add_image', 'product_images', inserted.id, null, inserted)
  return inserted
}

export async function removeProductImage(id: string) {
  const getClient = getSupabase()
  const supabase = await getClient()

  const { data: deleted, error } = await supabase
    .from('product_images')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await logAudit('remove_image', 'product_images', id, deleted, null)
  return deleted
}
