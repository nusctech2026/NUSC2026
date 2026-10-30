import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'NUSC IFL 2026–27 Workforce Registration',
  description: 'Register for one of seven NUSC IFL 2026–27 workforce departments.',
};

export default function CampaignRegisterPage() {
  redirect('/registrations');
}
