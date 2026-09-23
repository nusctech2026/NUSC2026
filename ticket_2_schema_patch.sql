-- Add max_redemptions_per_member to match_benefits
ALTER TABLE public.match_benefits 
ADD COLUMN IF NOT EXISTS max_redemptions_per_member INTEGER NOT NULL DEFAULT 1;
