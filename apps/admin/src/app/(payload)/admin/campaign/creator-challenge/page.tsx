import React from 'react';
import { redirect } from 'next/navigation';
import { assertStaffRole } from '../../../../../utils/supabaseServerClient';
import { CreatorChallengeEntriesView } from '../../../../../components/views/campaign/CreatorChallengeEntriesView';

export default async function CreatorChallengeAdminPage() {
  try {
    await assertStaffRole(['super_admin', 'campaign_manager', 'reviewer']);
  } catch {
    redirect('/admin');
  }

  return <CreatorChallengeEntriesView />;
}
