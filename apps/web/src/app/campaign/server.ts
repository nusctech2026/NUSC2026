import crypto from 'node:crypto';
import { createAdminClient } from '@nusc/db';

export class CampaignRateLimitError extends Error {}
export class CampaignServiceError extends Error {}

export function campaignSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('Campaign email access requires NEXT_PUBLIC_SITE_URL');
  }
  const url = new URL(configured || 'http://localhost:3000');
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
    throw new Error('Campaign site URL must use HTTPS');
  }
  return url.origin;
}

export async function campaignRateLimit(purpose: string, identity: string, limit: number, seconds = 900) {
  const bucket = `${purpose}:${crypto.createHash('sha256').update(identity).digest('hex')}`;
  const { data, error } = await createAdminClient().rpc('consume_campaign_rate_limit', {
    p_bucket: bucket, p_limit: limit, p_window_seconds: seconds,
  });
  if (error || typeof data !== 'boolean') {
    console.error('Campaign rate-limit service unavailable', { code: error?.code || 'INVALID_RESPONSE' });
    const missingSetup = ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error?.code || '');
    throw new CampaignServiceError(missingSetup && process.env.NODE_ENV !== 'production'
      ? 'Campaign database setup is incomplete. Apply the campaign migrations before testing registration.'
      : 'Campaign services are temporarily unavailable. Please try again later.');
  }
  if (!data) throw new CampaignRateLimitError(`Too many attempts. Please try again in up to ${Math.ceil(seconds / 60)} minutes.`);
}

type Role = { name?: string; code?: string };
export function campaignRoleLabel(role: Role | Role[] | null | undefined, other?: string | null) {
  const value = Array.isArray(role) ? role[0] : role;
  if ((value?.code?.endsWith('_others') || value?.name === 'Others') && other) return ['Others', other].join(': ');
  if ((value?.code === 'crew_others' || value?.name === 'Others') && other) return `Others: ${other}`;
  return value?.name || other || 'Not assigned';
}
