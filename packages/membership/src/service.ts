import { createAdminClient } from '@nusc/db';
import { membershipSchema, MembershipFormData } from './schemas';
import { assertMembershipCheckoutEnabled, paymentGateway } from './payments';

async function rollbackRegistration(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  triggerReason: string
) {
  const cleanupErrors: string[] = [];

  try {
    const { error: memberError } = await adminSupabase
      .from('members')
      .delete()
      .eq('user_id', userId);
    if (memberError) {
      cleanupErrors.push(`members: ${memberError.message}`);
    }
  } catch (e) {
    cleanupErrors.push(`members exception: ${(e as Error).message}`);
  }

  try {
    const { error: profileError } = await adminSupabase
      .from('member_profiles')
      .delete()
      .eq('user_id', userId);
    if (profileError) {
      cleanupErrors.push(`member_profiles: ${profileError.message}`);
    }
  } catch (e) {
    cleanupErrors.push(`member_profiles exception: ${(e as Error).message}`);
  }

  try {
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (authError) {
      cleanupErrors.push(`auth.users: ${authError.message}`);
    }
  } catch (e) {
    cleanupErrors.push(`auth.users exception: ${(e as Error).message}`);
  }

  if (cleanupErrors.length > 0) {
    console.error(
      `[ROLLBACK_PARTIAL_FAILURE] Failed to completely clean up resources for newly created user ${userId} after "${triggerReason}": ${cleanupErrors.join('; ')}`
    );
  }
}

export async function registerMember(data: MembershipFormData) {
  // Validate data with Zod
  const parsedData = membershipSchema.safeParse(data);
  if (!parsedData.success) {
    throw new Error('Validation failed');
  }

  const memberData = parsedData.data;

  // Fail before creating an account when payments are not configured.
  assertMembershipCheckoutEnabled();
  paymentGateway();

  // Initialize DB Client
  const adminSupabase = createAdminClient();

  // Normalize email and phone
  const normalizedEmail = memberData.email.toLowerCase().trim();
  const normalizedPhone = memberData.phone.replace(/\D/g, '');

  // Create user in Supabase Auth using admin client to bypass rate limits
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: normalizedEmail,
    password: memberData.password,
    email_confirm: true,
    user_metadata: { first_name: memberData.firstName.trim(), last_name: memberData.lastName.trim() },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      throw new Error('DUPLICATE_EMAIL');
    }
    throw new Error(`Failed to create account: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Failed to create user account.');
  }

  // Get base membership plan ID
  const { data: basePlan, error: planError } = await adminSupabase
    .from('membership_plans')
    .select('id')
    .eq('slug', 'registration')
    .eq('is_active', true)
    .single();

  if (planError || !basePlan) {
    await rollbackRegistration(adminSupabase, authData.user.id, 'base membership plan not found');
    throw new Error('Could not find base membership plan');
  }

  // Insert member into members table using admin client (to bypass RLS if any)
  const { data: rpcData, error: rpcError } = await adminSupabase.rpc('create_member_profile_and_record', {
    p_user_id: authData.user.id,
    p_first_name: memberData.firstName.trim(),
    p_last_name: memberData.lastName.trim(),
    p_phone: normalizedPhone,
    p_address: memberData.cityDistrict.trim(),
    p_dob: memberData.dateOfBirth,
    p_plan_id: basePlan.id,
    p_membership_type: 'standard'
  });

  if (rpcError) {
    await rollbackRegistration(adminSupabase, authData.user.id, `create_member_profile_and_record RPC failed: ${rpcError.message}`);
    throw new Error(`Failed to create member record: ${rpcError.message}`);
  }

  return { first_name: memberData.firstName.trim(), member_number: rpcData.member_number as string };
}
