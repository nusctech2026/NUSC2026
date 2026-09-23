-- Drop the old rigid uniqueness constraint since max_redemptions_per_member handles this dynamically in the RPC
DROP INDEX IF EXISTS public.unique_active_redemption_per_member;
