'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@payloadcms/ui'

const managerLinks = [
  { label: 'Overview', href: '/admin/campaign' },
  { label: 'Applications', href: '/admin/campaign/applications' },
  { label: 'Creator Challenge', href: '/admin/campaign/creator-challenge' },
  { label: 'Approved', href: '/admin/campaign/approved' },
  { label: 'Pass IDs', href: '/admin/campaign/ids' },
  { label: 'Matches', href: '/admin/campaign/matches' },
  { label: 'Attendance', href: '/admin/campaign/attendance' },
]

export const CampaignWorkspaceNav: React.FC = () => {
  const pathname = usePathname()
  const { user } = useAuth()
  const userRecord = user as { roles?: unknown; display_roles?: unknown } | null
  const roleNames = (value: unknown): string[] => Array.isArray(value)
    ? value.flatMap(item => {
      if (typeof item === 'string') return [item]
      if (item && typeof item === 'object' && 'role' in item && typeof item.role === 'string') return [item.role]
      return []
    })
    : []
  const roles = [...new Set([...roleNames(userRecord?.roles), ...roleNames(userRecord?.display_roles)])]
  const hasCampaignAccess = roles.some(role => ['super_admin', 'campaign_manager', 'reviewer', 'gate_staff'].includes(role))
  const gateOnly = roles.includes('gate_staff') && !roles.some(role => ['super_admin', 'campaign_manager', 'reviewer'].includes(role))
  const links = gateOnly ? [] : managerLinks.filter(link => link.href !== '/admin/campaign/matches' || roles.some(role => ['super_admin', 'campaign_manager'].includes(role)))
  const currentHref = pathname === '/admin/campaign'
    ? pathname
    : links.find(link => link.href !== '/admin/campaign' && pathname.startsWith(link.href))?.href

  if (!hasCampaignAccess) return null

  return (
    <nav className="campaign-workspace-nav" aria-label="Campaign workspace">
      <Link className="campaign-workspace-brand" href={gateOnly ? '/admin/campaign/scanner' : '/admin/campaign'}>
        NUSC <span>CAMPAIGN</span>
      </Link>
      <div className="campaign-workspace-links">
        {!gateOnly && links.map(link => (
          <Link key={link.href} href={link.href} aria-current={currentHref === link.href ? 'page' : undefined}>
            {link.label}
          </Link>
        ))}
      </div>
      <Link className="campaign-workspace-scan" href="/admin/campaign/scanner">Open scanner</Link>
    </nav>
  )
}
