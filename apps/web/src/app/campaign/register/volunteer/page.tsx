import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Volunteer Registration | NUSC Campaign',
  description: 'Apply as a Matchday Volunteer: Stretcher Boys, Perimeter, Security, Supervisors, and Hospitality.',
};

export default function VolunteerRegistrationPage() {
  redirect('/registrations?department=volunteer');
}
