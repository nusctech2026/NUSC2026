import React from 'react';
import { CampaignApplicationDetailView } from '../../../../../../components/views/campaign/CampaignApplicationDetailView';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/admin/campaign/applications"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748b',
            textDecoration: 'none',
          }}
        >
          ← Back to Applications List
        </Link>
      </div>
      <CampaignApplicationDetailView key={id} applicationId={id} />
    </div>
  );
}
