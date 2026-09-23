import { createServerClient } from '@nusc/db';

export interface DashboardData {
  member: any;
  wallet: {
    available_points: number;
  } | null;
  upcomingMatches: {
    match: any;
    benefits: any[];
  }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // 1. Fetch member profile
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', user.id)
    .single();

  // 2. Fetch wallet
  const { data: wallet } = await supabase
    .from('member_wallets')
    .select('available_points')
    .eq('user_id', user.id)
    .single();

  // 3. Fetch upcoming scheduled matches (where match_date is in the future)
  const now = new Date().toISOString();
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('status', 'scheduled')
    .gte('match_date', now)
    .order('match_date', { ascending: true });

  const upcomingMatches = [];

  if (matches && matches.length > 0) {
    const matchIds = matches.map((m: any) => m.id);
    
    // Fetch active benefits for these matches
    const { data: allBenefits } = await supabase
      .from('match_benefits')
      .select('*')
      .in('match_id', matchIds)
      .eq('active', true);

    const benefitsByMatch = (allBenefits || []).reduce((acc: any, benefit: any) => {
      // Calculate claim-window state based on server-side time
      let claimState = 'unavailable';
      const claimStart = benefit.claim_start ? new Date(benefit.claim_start) : null;
      const claimEnd = benefit.claim_end ? new Date(benefit.claim_end) : null;
      const currentTime = new Date();

      if (!claimStart && !claimEnd) {
        claimState = 'available'; // No window specified means always available
      } else if (claimStart && currentTime < claimStart) {
        claimState = 'upcoming';
      } else if (claimEnd && currentTime > claimEnd) {
        claimState = 'closed';
      } else {
        claimState = 'available';
      }

      const enhancedBenefit = {
        ...benefit,
        claimState,
      };

      if (!acc[benefit.match_id]) {
        acc[benefit.match_id] = [];
      }
      acc[benefit.match_id].push(enhancedBenefit);
      return acc;
    }, {});

    for (const match of matches) {
      upcomingMatches.push({
        match,
        benefits: benefitsByMatch[match.id] || [],
      });
    }
  }

  return {
    member,
    wallet,
    upcomingMatches
  };
}
