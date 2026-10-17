export function campaignPassUrl(slug: string): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
  if (!site) return null;
  try { return new URL(`/campaign/id/${encodeURIComponent(slug)}`, site).toString(); }
  catch { return null; }
}
