'use server';

import { createServerClient } from '@nusc/db';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password');
  const confirmation = formData.get('confirmation');
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Use a password of at least 8 characters.' };
  }
  if (password !== confirmation) return { error: 'Passwords do not match.' };

  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: 'Your reset link is invalid or has expired. Request a new link.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Unable to update your password. Please try again.' };

  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) return { error: 'Password updated, but sign-out failed. Please sign out before continuing.' };
  return { success: true };
}
