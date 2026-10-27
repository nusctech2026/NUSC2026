import { createServerClient } from '@nusc/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const destination = new URL('/reset-password', incoming.origin);
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
