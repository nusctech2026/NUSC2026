import { createAdminClient } from '@nusc/db';
import { membershipSchema, MembershipFormData } from './schemas';
import Razorpay from 'razorpay';

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
    .ilike('slug', 'Base-membership%')
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

  // Initiate ₹10 Razorpay Order
  const useMock = process.env.NODE_ENV !== 'production' && process.env.RAZORPAY_MOCK === 'true';

  let paymentOrderId = null;
  if (useMock) {
    paymentOrderId = 'mock_order_' + authData.user.id;
    const { error: updateError } = await adminSupabase
      .from('members')
      .update({ registration_order_id: paymentOrderId })
      .eq('user_id', authData.user.id);

    if (updateError) {
      console.error('Failed to persist mock registration_order_id:', updateError);
      await rollbackRegistration(adminSupabase, authData.user.id, `mock order persistence failed: ${updateError.message}`);
      throw new Error(`Failed to persist payment order: ${updateError.message}`);
    }
  } else {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
      key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
    });
    try {
      const order = await razorpay.orders.create({
        amount: 1000, // ₹10 in paise
        currency: 'INR',
        receipt: `reg_${authData.user.id}`,
        notes: { userId: authData.user.id, type: 'registration_fee' },
      });
      paymentOrderId = order.id;

      // Persist order ID to members record for authoritative order-to-member binding
      const { error: updateError } = await adminSupabase
        .from('members')
        .update({ registration_order_id: order.id })
        .eq('user_id', authData.user.id);

      if (updateError) {
        throw new Error(`Failed to persist payment order: ${updateError.message}`);
      }
    } catch (error) {
      console.error('Failed to initiate Razorpay order or persist registration_order_id:', error);
      await rollbackRegistration(adminSupabase, authData.user.id, `order creation/persistence failure: ${(error as Error).message}`);
      throw new Error(`Failed to initiate payment: ${(error as Error).message}`);
    }
  }

  if (!paymentOrderId) {
    await rollbackRegistration(adminSupabase, authData.user.id, 'paymentOrderId is missing');
    throw new Error('Failed to obtain payment order ID');
  }

  const memberResult = rpcData as { first_name?: unknown; member_number?: unknown } | null;
  if (typeof memberResult?.first_name !== 'string' || typeof memberResult.member_number !== 'string') {
    await rollbackRegistration(adminSupabase, authData.user.id, 'member profile RPC returned invalid data');
    throw new Error('Failed to create member record: invalid RPC response');
  }
  return { first_name: memberResult.first_name, member_number: memberResult.member_number, paymentOrderId };
}

