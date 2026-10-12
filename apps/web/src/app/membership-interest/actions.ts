'use server';

import { createAdminClient } from '@nusc/db';

export interface MembershipInterestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  cityDistrict: string;
  interestedTier: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
  notes?: string;
}

export async function submitMembershipInterest(input: MembershipInterestInput) {
  try {
    const firstName = input.firstName?.trim();
    const lastName = input.lastName?.trim();
    const email = input.email?.trim().toLowerCase();
    const phone = input.phone?.trim().replace(/\D/g, '');
    const dateOfBirth = input.dateOfBirth?.trim();
    const cityDistrict = input.cityDistrict?.trim();
    const interestedTier = input.interestedTier?.trim() || 'rise_general';
    const termsAccepted = input.termsAccepted === true;
    const marketingConsent = input.marketingConsent !== false;
    const notes = input.notes?.trim() || '';

    // Validation
    if (!firstName || firstName.length < 2) {
      return { success: false, error: 'First name must be at least 2 characters.' };
    }
    if (!lastName || lastName.length < 2) {
      return { success: false, error: 'Last name must be at least 2 characters.' };
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'A valid email address is required.' };
    }
    if (!phone || phone.length < 10) {
      return { success: false, error: 'A valid 10-digit mobile number is required.' };
    }
    if (!dateOfBirth || isNaN(Date.parse(dateOfBirth))) {
      return { success: false, error: 'Please provide a valid date of birth.' };
    }
    if (!cityDistrict) {
      return { success: false, error: 'Please select or enter your city / district.' };
    }
    if (!termsAccepted) {
      return { success: false, error: 'You must accept the terms and conditions to proceed.' };
    }

    // Direct database persistence via Supabase Admin Client
    const supabase = createAdminClient();
    const { data: inserted, error: dbError } = await supabase
      .from('membership_interests')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        date_of_birth: dateOfBirth,
        city_district: cityDistrict,
        interested_tier: interestedTier,
        terms_accepted: termsAccepted,
        marketing_consent: marketingConsent,
        notes,
        status: 'new',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Direct DB insert failed, checking error:', dbError);
      return { success: false, error: 'Could not save your pre-registration. Please try again.' };
    }

    return { success: true, doc: inserted };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Membership interest submission error:', err);
    return {
      success: false,
      error: err.message || 'An unexpected error occurred. Please try again.',
    };
  }
}
