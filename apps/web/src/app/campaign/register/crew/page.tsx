import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Crew & Technical Production Registration | NUSC Campaign',
  description: 'Apply for Technical Crew: Lights, LED, Sound, Technician, and matchday production operations.',
};

export default function CrewRegistrationPage() {
  redirect('/registrations?department=crew');
}
