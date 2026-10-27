'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from './actions';
import '@/components/membership/membership.css';
import './recovery.css';

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await requestPasswordReset(new FormData(event.currentTarget));
      if (result.error) setError(result.error);
      if (result.success) setMessage(result.success);
    } catch {
      setError('Password recovery is temporarily unavailable. Please try again later.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="member-recovery-page">
      <div className="member-recovery-card">
        <h1>Reset your password</h1>
        <p>Enter the email address for your NUSC member account. We’ll send you a reset link.</p>
        {message && <p className="member-recovery-status" role="status">{message}</p>}
        {error && <p className="member-recovery-error" role="alert">{error}</p>}
        <form onSubmit={submit} className="split-mem-form">
          <div className="split-mem-group">
            <label htmlFor="email">Email Address</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@example.com" />
          </div>
          <button className="member-recovery-submit" type="submit" disabled={pending}>
            {pending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
        <p><Link href="/login">Back to login</Link></p>
      </div>
    </main>
  );
}
