import { createServerClient } from '@nusc/db';
import Link from 'next/link';
import ResetPasswordForm from './ResetPasswordForm';
import '@/components/membership/membership.css';
import '../forgot-password/recovery.css';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="member-recovery-page">
      <div className="member-recovery-card">
        {user && !error ? (
          <ResetPasswordForm />
        ) : (
          <>
            <h1>Reset link unavailable</h1>
            <p role="alert">Your reset link is invalid or has expired.</p>
            <p><Link href="/forgot-password">Request a new reset link</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
