-- Add uniqueness protection for non-null authorization token hashes
CREATE UNIQUE INDEX IF NOT EXISTS ticket_redemptions_token_hash_unique
ON public.ticket_redemptions (token_hash)
WHERE token_hash IS NOT NULL;
