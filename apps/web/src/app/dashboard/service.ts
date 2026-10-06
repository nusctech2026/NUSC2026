import { createServerClient } from '@nusc/db';

export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_cycle: string;
  description: string;
  is_purchasable_online: boolean;
  is_active: boolean;
}

export interface Member {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  plan: MembershipPlan;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface DashboardData {
  profile: UserProfile;
  membership: Member | null;
  availablePlans: MembershipPlan[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const profile: UserProfile = {
    id: user.id,
    email: user.email || '',
    first_name: user.user_metadata?.first_name || '',
    last_name: user.user_metadata?.last_name || '',
  };

  // Fetch the user's active membership along with the plan details
  const { data: membershipData } = await supabase
    .from('members')
    .select('*, plan:membership_plans(*)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  // Fetch all active membership plans to show upgrades
  const { data: plans } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  return {
    profile,
    membership: membershipData as Member | null,
    availablePlans: (plans || []) as MembershipPlan[],
  };
}
