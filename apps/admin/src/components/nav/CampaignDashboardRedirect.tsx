'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@payloadcms/ui'
import { usePathname, useRouter } from 'next/navigation'
import { isCampaignOnlyStaff } from '../../auth/staffRoles'

export const CampaignDashboardRedirect: React.FC = () => {
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const campaignOnly = isCampaignOnlyStaff(user)

  useEffect(() => {
    if (campaignOnly && (pathname === '/admin' || pathname === '/admin/')) {
      router.replace('/admin/campaign')
    }
  }, [campaignOnly, pathname, router])

  return null
}
