'use client';

import React from 'react';
import Link from 'next/link';
import { NavGroup, useAuth } from '@payloadcms/ui';

export const CampaignNavLinks: React.FC = () => {
  const { user } = useAuth();
  const userRecord = user as { roles?: unknown; display_roles?: unknown } | null;
  const roleNames = (value: unknown): string[] => Array.isArray(value)
    ? value.flatMap(item => {
      if (typeof item === 'string') return [item];
      if (item && typeof item === 'object' && 'role' in item && typeof item.role === 'string') return [item.role];
      return [];
    })
    : [];
  const rawRoles = new Set([
    ...roleNames(userRecord?.roles),
    ...roleNames(userRecord?.display_roles),
  ]);

  const isSuperAdmin = rawRoles.has('super_admin');
  const isManager = rawRoles.has('campaign_manager');
  const isReviewer = rawRoles.has('reviewer');
  const isGateStaff = rawRoles.has('gate_staff');

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
        <Link href="/admin/campaign/creator-challenge" style={{ color: 'inherit', textDecoration: 'none' }}>
          Creator Challenge Entries
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
