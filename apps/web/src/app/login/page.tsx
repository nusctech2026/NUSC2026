import React from 'react';
import { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Log In | Nagaland United Sports Club',
  description: 'Log in to your NUSC Member Dashboard.',
};

export default function LoginPage() {
  return (
    <main>
      <LoginForm />
    </main>
  );
}
