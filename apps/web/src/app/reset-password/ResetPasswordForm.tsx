'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { updatePassword } from './actions';

export default function ResetPasswordForm({ unavailable }: { unavailable: boolean }) {
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await updatePassword(new FormData(event.currentTarget));
      if (result.error) setError(result.error);
      if (result.success) setDone(true);
    } catch {
      setError('Unable to update your password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {done ? (
        <>
          <h1>Password Reset Successful!</h1>
          <p className="member-recovery-status" role="status">
            Your password has been updated successfully. You can now log in to your RISE Membership account using your new password.
          </p>
          <p><Link href="/login">Back to Membership Login</Link></p>
        </>
      ) : unavailable ? (
        <>
          <h1>Reset link unavailable</h1>
          <p role="alert">Your reset link is invalid or has expired.</p>
          <p><Link href="/forgot-password">Request a new reset link</Link></p>
        </>
      ) : (
        <>
          <h1>Choose a new password</h1>
          <p>Enter and confirm your new password.</p>
          {error && <p className="member-recovery-error" role="alert">{error}</p>}
          <form onSubmit={submit} className="split-mem-form">
            <div className="split-mem-group">
              <label htmlFor="password">New password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <div className="split-mem-group">
              <label htmlFor="confirmation">Confirm new password</label>
              <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" minLength={8} required />
            </div>
            <button className="member-recovery-submit" type="submit" disabled={pending}>
              {pending ? 'Updating...' : 'Update password'}
            </button>
          </form>
          <p><Link href="/forgot-password">Request a new reset link</Link></p>
        </>
      )}
    </>
  );
}
