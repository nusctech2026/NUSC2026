import { createAdminClient } from '@nusc/db';
import { membershipSchema, MembershipFormData } from './schemas';
import Razorpay from 'razorpay';

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
    if (authError.message.includes('already registered')) {
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
    // Attempt rollback of Auth user
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
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
    // Attempt rollback of Auth user if member insert fails
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
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
      await adminSupabase.from('members').delete().eq('user_id', authData.user.id);
      await adminSupabase.from('member_profiles').delete().eq('user_id', authData.user.id);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
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
      // Clean up member and auth user so user does not get stuck with duplicate email error on retry
      await adminSupabase.from('members').delete().eq('user_id', authData.user.id);
      await adminSupabase.from('member_profiles').delete().eq('user_id', authData.user.id);
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to initiate payment: ${(error as Error).message}`);
    }
  }

  if (!paymentOrderId) {
    await adminSupabase.from('members').delete().eq('user_id', authData.user.id);
    await adminSupabase.from('member_profiles').delete().eq('user_id', authData.user.id);
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    throw new Error('Failed to obtain payment order ID');
  }

  return { ...rpcData, paymentOrderId };
}

