'use client'

import React from 'react'
import Link from 'next/link'
import { NavGroup, useAuth } from '@payloadcms/ui'

export const MembershipFulfillmentNavLinks: React.FC = () => {
  const { user } = useAuth()
  const collectRoles = (value: unknown): string[] => Array.isArray(value)
    ? value.flatMap((item) => {
      if (typeof item === 'string') return [item]
      if (item && typeof item === 'object' && 'role' in item && typeof item.role === 'string') return [item.role]
      return []
    })
    : []
  const currentUser = user as { roles?: unknown; display_roles?: unknown } | null
  const roles = new Set([...collectRoles(currentUser?.roles), ...collectRoles(currentUser?.display_roles)])
  if (!roles.has('super_admin') && !roles.has('store_manager') && !roles.has('membership_manager')) return null

  return (
    <NavGroup label="Membership Operations">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 24 }}>
        <Link href="/admin/membership-fulfillment" style={{ color: 'inherit', textDecoration: 'none' }}>
          Ticket Fulfillment
        </Link>
      </div>
    </NavGroup>
  )
}
