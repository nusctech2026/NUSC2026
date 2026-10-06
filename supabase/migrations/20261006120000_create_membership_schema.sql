-- NUSC Membership Schema

-- Membership Plans
CREATE TABLE IF NOT EXISTS public.membership_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0),
    billing_cycle TEXT NOT NULL DEFAULT 'season',
    description TEXT,
    is_purchasable_online BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Membership Benefits
CREATE TABLE IF NOT EXISTS public.membership_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- e.g., 'tickets', 'discount', 'content', 'events', 'physical_goods'
    description TEXT NOT NULL,
    metadata JSONB, -- Machine-readable rules
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Members
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMP WITH TIME ZONE,
    lead_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL, -- For VIP guests
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL, -- Links to store payments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Benefit Redemptions
CREATE TABLE IF NOT EXISTS public.benefit_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    benefit_id UUID NOT NULL REFERENCES public.membership_benefits(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_plan_id ON public.members(plan_id);
CREATE INDEX IF NOT EXISTS idx_members_lead_member_id ON public.members(lead_member_id);
CREATE INDEX IF NOT EXISTS idx_membership_benefits_plan_id ON public.membership_benefits(plan_id);
CREATE INDEX IF NOT EXISTS idx_benefit_redemptions_member_id ON public.benefit_redemptions(member_id);

-- Triggers for updated_at
CREATE TRIGGER set_membership_plans_updated_at BEFORE UPDATE ON public.membership_plans FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_membership_benefits_updated_at BEFORE UPDATE ON public.membership_benefits FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();
CREATE TRIGGER set_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS setup
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_redemptions ENABLE ROW LEVEL SECURITY;

-- Grants
REVOKE ALL ON public.membership_plans, public.membership_benefits, public.members, public.benefit_redemptions FROM anon, authenticated;
GRANT SELECT ON public.membership_plans, public.membership_benefits TO anon, authenticated;
GRANT SELECT ON public.members, public.benefit_redemptions TO authenticated;

-- Public Policies
CREATE POLICY "Public plans are viewable by everyone" ON public.membership_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Public benefits are viewable by everyone" ON public.membership_benefits FOR SELECT USING (is_active = true);

-- User Policies
CREATE POLICY "Users can view their own membership" ON public.members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own redemptions" ON public.benefit_redemptions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members WHERE id = benefit_redemptions.member_id AND user_id = auth.uid())
);

-- Admin Policies
CREATE POLICY "Admins can manage membership plans" ON public.membership_plans FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager']));
CREATE POLICY "Admins can manage membership benefits" ON public.membership_benefits FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager']));
CREATE POLICY "Admins can manage members" ON public.members FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager']));
CREATE POLICY "Admins can view redemptions" ON public.benefit_redemptions FOR SELECT USING (public.has_role(ARRAY['super_admin', 'store_manager', 'fulfillment_staff']));
CREATE POLICY "Admins can manage redemptions" ON public.benefit_redemptions FOR ALL USING (public.has_role(ARRAY['super_admin', 'store_manager']));
