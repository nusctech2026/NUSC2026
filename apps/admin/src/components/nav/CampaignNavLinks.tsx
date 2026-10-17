'use client';

import React from 'react';
import Link from 'next/link';
import { NavGroup, useAuth } from '@payloadcms/ui';

export const CampaignNavLinks: React.FC = () => {
  const { user } = useAuth();
  const rawRoles = Array.isArray((user as any)?.roles)
    ? (user as any).roles
    : ((user as any)?.display_roles?.map((r: any) => (typeof r === 'string' ? r : r?.role)) || []);

  const isSuperAdmin = rawRoles.includes('super_admin');
  const isManager = rawRoles.includes('campaign_manager');
  const isReviewer = rawRoles.includes('reviewer');
  const isGateStaff = rawRoles.includes('gate_staff');

  // If user has no campaign-related role, do not render the campaign nav group
  if (!isSuperAdmin && !isManager && !isReviewer && !isGateStaff) {
    return null;
  }

  // Gate staff isolation: Gate staff only sees the QR Gate Scanner
  if (isGateStaff && !isSuperAdmin && !isManager && !isReviewer) {
    return (
      <NavGroup label="Gate Operations">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
          <Link href="/admin/campaign/scanner" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
            ⚡ QR Gate Scanner
          </Link>
        </div>
      </NavGroup>
    );
  }

  return (
    <NavGroup label="Campaign Operations">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '24px' }}>
        <Link href="/admin/campaign" style={{ color: 'inherit', textDecoration: 'none' }}>
          📊 Overview
        </Link>
        <Link href="/admin/campaign/applications" style={{ color: 'inherit', textDecoration: 'none' }}>
          📝 Applications
        </Link>
        <Link href="/admin/campaign/approved" style={{ color: 'inherit', textDecoration: 'none' }}>
          ✅ Approved Candidates
        </Link>
        {(isSuperAdmin || isManager) && (
          <Link href="/admin/campaign/ids" style={{ color: 'inherit', textDecoration: 'none' }}>
            🎟️ Issued Event IDs
          </Link>
        )}
        {(isSuperAdmin || isManager) && <Link href="/admin/campaign/matches" style={{ color: 'inherit', textDecoration: 'none' }}>
          Matches
        </Link>}
        {(isSuperAdmin || isManager) && <Link href="/admin/campaign/scanner" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
          ⚡ QR Gate Scanner
        </Link>}
        {(isSuperAdmin || isManager) && (
          <Link href="/admin/campaign/attendance" style={{ color: 'inherit', textDecoration: 'none' }}>
            📋 Attendance Logs
          </Link>
        )}
      </div>
    </NavGroup>
  );
};
