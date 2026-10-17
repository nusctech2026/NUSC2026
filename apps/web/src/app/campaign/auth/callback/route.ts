import { createServerClient } from '@nusc/db';
import { NextResponse } from 'next/server';
import { campaignSiteOrigin } from '../../server';

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const destination = new URL('/campaign/status', campaignSiteOrigin());
  const number = incoming.searchParams.get('num');
  if (number && /^NUSC-CMP-\d{4}-[A-Z0-9]{5,32}$/i.test(number)) destination.searchParams.set('num', number);
  const code = incoming.searchParams.get('code');
  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code, {
      flowId: incoming.searchParams.get('sb_flow_id') || undefined,
    });
    if (!error) return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
  }
  destination.searchParams.set('access', 'expired');
  return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
}
