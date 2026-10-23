const LOCAL_SITE_URL = 'http://localhost:3100';

export function recoverySiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('Site URL is not configured');
  }

  const siteUrl = new URL(configured || LOCAL_SITE_URL);
  const localHttp = process.env.NODE_ENV !== 'production'
    && siteUrl.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(siteUrl.hostname);

  if (siteUrl.username || siteUrl.password) throw new Error('Site URL cannot contain credentials');
  if (siteUrl.protocol !== 'https:' && !localHttp) throw new Error('Site URL must use HTTPS');
  return siteUrl.origin;
}

export function recoveryCallbackUrl() {
  return new URL('/auth/recovery', recoverySiteOrigin()).toString();
}