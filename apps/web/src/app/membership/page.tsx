import React from 'react';
import { Metadata } from 'next';
import SplitMembershipLayout from '@/components/membership/SplitMembershipLayout';

export const metadata: Metadata = {
  title: 'Membership | Nagaland United Sports Club',
  description: 'Join the Nagaland United Sports Club membership program for exclusive benefits, priority ticketing, and more.',
};

export default function MembershipPage() {
  return (
    <main>
      <SplitMembershipLayout />
    </main>
  );
}
