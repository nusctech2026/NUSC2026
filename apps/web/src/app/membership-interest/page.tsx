import React from 'react';
import { Metadata } from 'next';
import MembershipInterestLayout from '@/components/membership-interest/MembershipInterestLayout';

export const metadata: Metadata = {
  title: 'Membership Pre-Registration | Nagaland United Sports Club',
  description:
    'Pre-register for official Nagaland United Sports Club membership. Get priority access to ticket benefits, kits, and club events before official launch.',
};

export default function MembershipInterestPage() {
  return (
    <main>
      <MembershipInterestLayout />
    </main>
  );
}
