'use server';

import { createServerClient } from '@nusc/db';
import { redirect } from 'next/navigation';

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
