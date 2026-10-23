import { createServerClient } from '@nusc/db';
import ResetPasswordForm from './ResetPasswordForm';
import '@/components/membership/membership.css';
import '../forgot-password/recovery.css';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  let user = null;
  if (!error) {
    const supabase = await createServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return (
    <main className="member-recovery-page">
      <div className="member-recovery-card">
        <ResetPasswordForm unavailable={!user || Boolean(error)} />
      </div>
    </main>
  );
}
