import React from 'react'
import Link from 'next/link'
import { NavGroup } from '@payloadcms/ui'

export const StoreNavLinks: React.FC = () => {
  return (
    <NavGroup label="Store Operations">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
        <Link href="/admin/orders" style={{ color: 'inherit', textDecoration: 'none' }}>Orders</Link>
        <Link href="/admin/fulfilment" style={{ color: 'inherit', textDecoration: 'none' }}>Fulfilment</Link>
        <Link href="/admin/payments" style={{ color: 'inherit', textDecoration: 'none' }}>Payments</Link>
        <Link href="/admin/returns" style={{ color: 'inherit', textDecoration: 'none' }}>Returns & Refunds</Link>
        <Link href="/admin/inventory" style={{ color: 'inherit', textDecoration: 'none' }}>Inventory</Link>
      </div>
    </NavGroup>
  )
}

export const CatalogNavLinks: React.FC = () => {
  return (
    <NavGroup label="Store Catalog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
        <Link href="/admin/products" style={{ color: 'inherit', textDecoration: 'none' }}>Products</Link>
        <Link href="/admin/categories" style={{ color: 'inherit', textDecoration: 'none' }}>Categories</Link>
        <Link href="/admin/product-variants" style={{ color: 'inherit', textDecoration: 'none' }}>Product Variants</Link>
        <Link href="/admin/product-images" style={{ color: 'inherit', textDecoration: 'none' }}>Product Images</Link>
        <Link href="/admin/coupons" style={{ color: 'inherit', textDecoration: 'none' }}>Coupons</Link>
        <Link href="/admin/collections" style={{ color: 'inherit', textDecoration: 'none' }}>Collections</Link>
      </div>
    </NavGroup>
  )
}

export const SystemNavLinks: React.FC = () => {
  return (
    <NavGroup label="System">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
        <Link href="/admin/roles" style={{ color: 'inherit', textDecoration: 'none' }}>Roles & Permissions</Link>
        <Link href="/admin/staff" style={{ color: 'inherit', textDecoration: 'none' }}>Staff Directory</Link>
        <Link href="/admin/integrations" style={{ color: 'inherit', textDecoration: 'none' }}>Integrations</Link>
        <Link href="/admin/audit-logs" style={{ color: 'inherit', textDecoration: 'none' }}>Audit Logs</Link>
        <Link href="/admin/system-health" style={{ color: 'inherit', textDecoration: 'none' }}>System Health</Link>
      </div>
    </NavGroup>
  )
}
