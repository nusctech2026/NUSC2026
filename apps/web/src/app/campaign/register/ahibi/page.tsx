import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Ahibi Ticketing Registration | NUSC Campaign',
  description: 'Apply for Ahibi Ticketing operations for Nagaland United Sports Club home matches.',
};

export default function AhibiRegistrationPage() {
  redirect('/registrations?department=ahibi');
}
