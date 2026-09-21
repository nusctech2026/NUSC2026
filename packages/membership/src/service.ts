import { createAdminClient, createServerClient } from '@nusc/db';
import { membershipSchema, MembershipFormData } from './schemas';

export async function registerMember(data: MembershipFormData) {
  // Validate data with Zod
  const parsedData = membershipSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error('Validation failed');
  }

  const memberData = parsedData.data;

  // Initialize DB Clients
  const adminSupabase = createAdminClient();
  const supabase = await createServerClient();

  // Normalize email and phone
  const normalizedEmail = memberData.email.toLowerCase().trim();
  const normalizedPhone = memberData.phone.replace(/\D/g, '');

  // Check for duplicate email (in our members table)
  const { data: existingMember, error: duplicateCheckError } = await adminSupabase
    .from('members')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
    // PGRST116 means 0 rows returned, which is good
    throw new Error(`Database error: ${duplicateCheckError.message}`);
  }

  if (existingMember) {
    throw new Error('DUPLICATE_EMAIL');
  }

  // Create user in Supabase Auth using admin client to bypass rate limits
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: normalizedEmail,
    password: memberData.password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('DUPLICATE_EMAIL');
    }
    throw new Error(`Failed to create account: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create user account.');
  }

  // Generate a random membership number
  const randomSuffix = Math.floor(100000 + Math.random() * 900000); // 6 digits
  const membershipNumber = `NUSC-${randomSuffix}`;

  // Insert member into members table using admin client (to bypass RLS if any)
  const { data: insertedMember, error: insertError } = await adminSupabase
    .from('members')
    .insert([
      {
        id: authData.user.id, // Link member record to Auth User ID
        membership_number: membershipNumber,
        first_name: memberData.firstName.trim(),
        last_name: memberData.lastName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        date_of_birth: memberData.dateOfBirth,
        city_district: memberData.cityDistrict.trim(),
        membership_type: 'standard',
        status: 'active',
        marketing_consent: !!memberData.marketingConsent,
      },
    ])
    .select()
    .single();

  if (insertError) {
    // Attempt rollback of Auth user if member insert fails
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create member record: ${insertError.message}`);
  }

  return insertedMember;
}
