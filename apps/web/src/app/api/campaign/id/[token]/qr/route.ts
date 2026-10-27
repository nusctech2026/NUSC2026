import { NextRequest } from 'next/server';
import { createAdminClient } from '@nusc/db';
import QRCode from 'qrcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const passSlug = (token || '').trim();

    if (!passSlug) {
      return new Response('Missing pass identifier', { status: 400 });
    }

    const supabase = createAdminClient();

    // Query active ID record to obtain the authentic secret qr_token
    const { data: idRecord, error } = await supabase
      .from('campaign_ids')
      .select('qr_token, is_active, revoked_at, valid_from, valid_until, application:campaign_applications!application_id (application_status)')
      .eq('pass_slug', passSlug)
      .maybeSingle();

    const app = idRecord?.application as unknown as { application_status: string } | null;
    if (error || !idRecord || !idRecord.is_active || idRecord.revoked_at || app?.application_status !== 'approved'
        || Date.now() < new Date(idRecord.valid_from).getTime() || Date.now() > new Date(idRecord.valid_until).getTime()) {
      // Return clean placeholder SVG showing revoked/invalid state
      const invalidSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#fee2e2" rx="10"/>
          <text x="100" y="95" fill="#991b1b" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">INVALID / REVOKED</text>
          <text x="100" y="115" fill="#991b1b" font-family="sans-serif" font-size="11" text-anchor="middle">Pass not valid for entry</text>
        </svg>
      `;
      return new Response(invalidSvg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Generate crisp vector SVG containing the secret qr_token
    const svg = await QRCode.toString(idRecord.qr_token, {
      type: 'svg',
      margin: 1,
      width: 220,
      color: {
        dark: '#050f24',
        light: '#ffffff',
      },
    });

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (err) {
    console.error('QR generation route error:', err);
    return new Response('Error generating QR code', { status: 500 });
  }
}
