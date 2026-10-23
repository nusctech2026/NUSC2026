import { createServerClient } from '@nusc/db';
import { NextResponse } from 'next/server';
import { recoverySiteOrigin } from '../../forgot-password/recovery-url';

export async function GET(request: Request) {
  let siteOrigin: string;
  try {
    siteOrigin = recoverySiteOrigin();
  } catch {
    return new NextResponse(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }

  const incoming = new URL(request.url);
  const destination = new URL('/reset-password', siteOrigin);
  const code = incoming.searchParams.get('code');
  if (code) {
    const supabase = await createServerClient();
    const flowId = incoming.searchParams.get('sb_flow_id') || undefined;
    const { error } = await supabase.auth.exchangeCodeForSession(code, { flowId });
    if (!error) return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
  }
  destination.searchParams.set('error', 'expired');
  return NextResponse.redirect(destination, { headers: { 'Cache-Control': 'no-store' } });
}