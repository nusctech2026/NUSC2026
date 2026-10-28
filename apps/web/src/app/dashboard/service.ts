import { createServerClient, createAdminClient } from '@nusc/db';

export interface MembershipPlan {
  id: string; name: string; slug: string; price: number; billing_cycle: string;
  description: string; is_purchasable_online: boolean; is_active: boolean;
}
export interface Member {
  id: string; user_id: string; plan_id: string; lead_member_id: string | null;
  status: string; start_date: string; end_date: string | null;
  registration_payment_status: string; membership_number: string; plan: MembershipPlan;
}
export interface UserProfile { id: string; email: string; first_name: string; last_name: string }
export interface DashboardData {
  profile: UserProfile; membership: Member | null; availablePlans: MembershipPlan[];
  pendingPayment: { id: string; plan_id: string; purpose: string; ahibi_zone: string | null; ahibi_pass_id: string | null; ahibi_pass_status: string; ahibi_reservation_expires_at: string | null } | null;
  entitlements: Record<string, unknown>;
}

export interface TicketsDashboardData {
  profile: Pick<UserProfile, 'id'>;
  membership: Member | null;
  hasActiveTier: boolean;
  entitlements: Record<string, unknown>;
}

export async function getTicketsDashboardData(): Promise<TicketsDashboardData> {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Unauthorized');

  const { data: member, error: memberError } = await supabase.from('members')
    .select('*, plan:membership_plans(*)').eq('user_id', user.id).maybeSingle();
  if (memberError) throw new Error('Unable to load membership');
  if (member && !member.plan) {
    const { data: historicalPlan, error } = await createAdminClient().from('membership_plans')
      .select('id,name,slug,price,billing_cycle,description,is_purchasable_online,is_active')
      .eq('id', member.plan_id).single();
    if (error || !historicalPlan) throw new Error('Unable to load membership plan');
    member.plan = historicalPlan;
  }

  const membership = member as Member | null;
  const active = Boolean(membership && membership.registration_payment_status === 'paid'
    && membership.status === 'active'
    && (!membership.end_date || new Date(membership.end_date) > new Date()));
  const hasActiveTier = Boolean(active && membership
    && ['rise-general', 'rise-premium', 'rise-vip-box'].includes(membership.plan.slug));

  let entitlements: Record<string, unknown> = {};
  if (hasActiveTier && membership && !['rise-general', 'rise-premium'].includes(membership.plan.slug)) {
    const { data: benefit, error } = await supabase.from('membership_benefits')
      .select('metadata').eq('plan_id', membership.plan_id)
      .eq('category', 'annual_entitlements').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error('Unable to load membership entitlements');
    entitlements = (benefit?.metadata && typeof benefit.metadata === 'object' && !Array.isArray(benefit.metadata))
      ? benefit.metadata as Record<string, unknown> : {};
  }

  return { profile: { id: user.id }, membership, hasActiveTier, entitlements };
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const [memberResult, plansResult, profileResult, pendingResult] = await Promise.all([
    supabase.from('members').select('*, plan:membership_plans(*)').eq('user_id', user.id).maybeSingle(),
    supabase.from('membership_plans').select('*').eq('is_active', true)
      .in('slug', ['rise-general', 'rise-premium', 'rise-vip-box']).order('price', { ascending: true }),
    supabase.from('member_profiles').select('first_name,last_name').eq('user_id', user.id).maybeSingle(),
    supabase.from('membership_payment_orders').select('id,plan_id,purpose,ahibi_zone,ahibi_pass_id,ahibi_pass_status,ahibi_reservation_expires_at').eq('user_id', user.id).in('status', ['creating','pending']).maybeSingle(),
  ]);
  if (memberResult.error || plansResult.error || profileResult.error || pendingResult.error) throw new Error('Unable to load membership');
  // Inactive plans are hidden by public plan RLS, but existing members retain their
  // purchased plan details. The plan ID comes exclusively from this user's RLS-scoped member row.
  if (memberResult.data && !memberResult.data.plan) {
    const { data: historicalPlan, error } = await createAdminClient().from('membership_plans')
      .select('id,name,slug,price,billing_cycle,description,is_purchasable_online,is_active')
      .eq('id', memberResult.data.plan_id).single();
    if (error || !historicalPlan) throw new Error('Unable to load membership plan');
    memberResult.data.plan = historicalPlan;
  }
  let entitlements: Record<string, unknown> = {};
  if (memberResult.data?.plan_id) {
    const { data: benefit, error } = await supabase.from('membership_benefits')
      .select('metadata').eq('plan_id', memberResult.data.plan_id)
      .eq('category', 'annual_entitlements').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error('Unable to load membership entitlements');
    entitlements = (benefit?.metadata && typeof benefit.metadata === 'object' && !Array.isArray(benefit.metadata))
      ? benefit.metadata as Record<string, unknown> : {};
  }
  return {
    profile: { id: user.id, email: user.email || '', first_name: profileResult.data?.first_name || '', last_name: profileResult.data?.last_name || '' },
    membership: memberResult.data as Member | null,
    availablePlans: (plansResult.data || []) as MembershipPlan[],
    pendingPayment: pendingResult.data,
    entitlements,
  };
}
