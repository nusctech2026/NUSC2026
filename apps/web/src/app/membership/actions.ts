'use server';

import { registerMember, MembershipFormData } from '@nusc/membership';
import { revalidatePath } from 'next/cache';

export async function submitMembership(data: MembershipFormData) {
  try {
    const member = await registerMember(data);
    revalidatePath('/membership');
    return { success: true, member };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Membership registration error:', err);
    
    if (err.message === 'DUPLICATE_EMAIL') {
      return { success: false, error: 'An account with this email already exists.' };
    }
    
    return { success: false, error: err.message || 'Something went wrong.' };
  }
}
