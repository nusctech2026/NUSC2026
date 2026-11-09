import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inflateSync } from 'node:zlib';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { loadSource } from './fixtures/campaign-actions.mjs';
const passCrest = loadSource('apps/admin/src/utils/campaignPassCrest.ts', {});
const passPdfRenderer = loadSource('apps/admin/src/utils/campaignPassPdf.ts', {
  './campaignPassCrest': passCrest,
});
const { renderCampaignPassCardSvg, renderCampaignPassSvgToPng, renderCampaignPassPdf } = passPdfRenderer;
const { campaignPassRoleLabel } = loadSource('apps/admin/src/utils/campaignRoleLabel.ts', {});

const qrToken = 'a'.repeat(64);
const termsUrl = 'https://campaign.example.invalid/terms';

async function accreditationData() {
  const portrait = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="524"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#90a8b2"/><stop offset="1" stop-color="#314d60"/></linearGradient></defs><rect width="420" height="524" fill="url(#bg)"/><path d="M55 524c12-116 65-165 155-165s143 49 155 165" fill="#cf5a42"/><ellipse cx="210" cy="190" rx="93" ry="117" fill="#9b664b"/><path d="M118 186c7-98 49-141 106-141 65 0 105 51 94 144-17-42-39-66-74-69-30 40-68 57-126 66" fill="#201b1b"/><path d="M170 248q40 25 80 0" fill="none" stroke="#693f35" stroke-width="8" stroke-linecap="round"/></svg>`);
  const photoImage = await sharp(portrait).png().toBuffer();
  const qrImage = await QRCode.toBuffer(qrToken, {
    type: 'png', errorCorrectionLevel: 'H', margin: 2, width: 480,
    color: { dark: '#050f24', light: '#ffffff' },
  });
  const termsQrImage = await QRCode.toBuffer(termsUrl, {
    type: 'png', errorCorrectionLevel: 'M', margin: 3, width: 480,
    color: { dark: '#081936', light: '#ffffff' },
  });
  return {
    fullName: 'Rishav N. Kikon',
    registrationId: 'NUSC-VOL-2026-0142',
    idNumber: 'NUSC-ID-2026-ABCDEF12',
    category: 'volunteer',
    accreditationType: 'Match-day pass',
    assignedRole: 'Gate 1 Scanning',
    assignedMatch: 'Nagaland United vs Kohima United',
    assignedZone: 'North Stand \u00b7 Gate 1 checkpoint',
    validFrom: '2026-11-04T00:00:00.000Z',
    validUntil: '2026-12-31T23:59:59.000Z',
    eventVenue: 'Ch\u00fcmoukedima Football Stadium, Nagaland',
    photoImage,
    qrImage,
    termsQrImage,
  };
}

function extractPdfImage(pdf) {
  const text = pdf.toString('latin1');
  const match = /\/Subtype \/Image \/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode \/Length (\d+) >>\nstream\n/.exec(text);
  assert.ok(match, 'single-page PDF should contain the rendered ID image');
  const streamStart = match.index + match[0].length;
  const compressed = pdf.subarray(streamStart, streamStart + Number(match[3]));
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    pixels: inflateSync(compressed),
  };
}

async function decodePdfQr(pdf, svg, imageId) {
  const image = extractPdfImage(pdf);
  const position = new RegExp(`<image id="${imageId}" x="([\\d.]+)" y="([\\d.]+)" width="([\\d.]+)" height="([\\d.]+)"`).exec(svg);
  assert.ok(position, `${imageId} should have a fixed image position`);
  const scaleX = image.width / 860;
  const scaleY = image.height / 1440;
  const left = Math.round(Number(position[1]) * scaleX);
  const top = Math.round(Number(position[2]) * scaleY);
  const size = Math.round(Number(position[3]) * scaleX);
  const pixels = await sharp(image.pixels, { raw: { width: image.width, height: image.height, channels: 3 } })
    .extract({ left, top, width: size, height: size })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return jsQR(new Uint8ClampedArray(pixels), size, size)?.data;
}

test('ID role labels show the applicant specified role for every Other choice', () => {
  assert.equal(campaignPassRoleLabel({ name: 'Other', code: 'medical_others' }, '  Sports Photographer  '), 'Sports Photographer');
  assert.equal(campaignPassRoleLabel({ name: 'Others', code: 'volunteer_others' }, 'Gate Supervisor'), 'Gate Supervisor');
  assert.equal(campaignPassRoleLabel({ name: 'Gate 1 Scanning', code: 'gate_1_scanning' }, 'Custom role'), 'Gate 1 Scanning');
});

test('workforce ID PDF renders all fields and decodes its embedded QR', async () => {
    const data = await accreditationData();
    const svg = await renderCampaignPassCardSvg(data);
    assert.ok(svg.includes('Nagaland United vs'));
    assert.ok(svg.includes('Kohima United'));
    for (const text of [
      'APPROVED', 'VOLUNTEERS', 'GATE 1 SCANNING', 'WORKFORCE ID', 'NUSC-ID-2026-ABCDEF12',
      'North Stand \u00b7 Gate 1 checkpoint', 'Match-day pass',
      'VALID FROM', 'VALID UNTIL', '4 Nov 2026', '1 Jan 2027',
      'VENUE', 'Ch\u00fcmoukedima Football Stadium, Nagaland',
    ]) assert.ok(svg.includes(text), `SVG preview should contain ${text}`);
    assert.match(svg, /data:image\/jpeg;base64,/);
    assert.match(svg, /data:image\/png;base64,/);
    assert.match(svg, /<image id="terms-qr"/);
    assert.match(svg, /MATCH ACCESS/);
    assert.match(svg, /GATE \/ CHECKPOINT/);

    const pdf = await renderCampaignPassPdf(data);
    const pdfText = pdf.toString('latin1');
    assert.match(pdfText, /^%PDF-1\.4/);
    assert.match(pdfText, /\/Count 1\b/);
    assert.equal((pdfText.match(/\/Type \/Page\b/g) || []).length, 1);
    assert.match(pdfText, /\/MediaBox \[0 0 243\.7795 408\.1890\]/);

    const image = extractPdfImage(pdf);
    assert.equal(image.width, 1016);
    assert.equal(image.height, 1701);
    assert.equal(image.pixels.length, image.width * image.height * 3);
    assert.equal(await decodePdfQr(pdf, svg, 'pass-qr'), qrToken);
    assert.equal(await decodePdfQr(pdf, svg, 'terms-qr'), termsUrl);
});

test('PDF artwork preserves the actual Admin card brand and all five access fields', async () => {
  const data = await accreditationData();
  const svg = await renderCampaignPassCardSvg(data);
  for (const label of [
    'NAGALAND', 'UNITED SC', 'APPROVED', 'WORKFORCE ID', 'MATCH ACCESS',
    'GATE / CHECKPOINT', 'VALID FROM', 'VALID UNTIL', 'VENUE',
    'ENTRY &amp; ATTENDANCE QR',
  ]) assert.ok(svg.includes(label), 'Admin ID artwork should include ' + label);
  assert.match(svg, /data:image\/png;base64,/);
  assert.ok(svg.includes('NUSC-ID-2026-ABCDEF12'));
  const pdf = await renderCampaignPassPdf(data);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1);
  const image = extractPdfImage(pdf);
  assert.equal(image.width, 1016);
  assert.equal(image.height, 1701);
});

test('pass email sends matching PDF and PNG ID attachments from the approved ID data', async () => {
  const calls = [];
  const currentDate = Date.now();
  const row = {
    id_number: 'NUSC-ID-2026-ABCDEF12',
    pass_slug: 'synthetic-private-pass-slug',
    qr_token: qrToken,
    valid_from: new Date(currentDate - 60_000).toISOString(),
    valid_until: new Date(currentDate + 86_400_000).toISOString(),
    is_active: true,
    revoked_at: null,
    application: {
      full_name: 'Rishav N. Kikon',
      application_number: 'NUSC-VOL-2026-0142',
      email: 'rishav@example.invalid',
      phone: '9876543210',
      whatsapp_pass_opt_in_at: null,
      application_status: 'approved',
      category: 'medical',
      photo_storage_path: 'synthetic/photo.png',
      event_id: 'synthetic-match-id',
      designation: null,
      media_designation: null,
      other_role: 'Sports Photographer',
      assigned_role: { name: 'Other', code: 'medical_others' },
      assigned_zone: 'North Stand \u00b7 Gate 1 checkpoint',
      event: { title: 'Nagaland United vs Kohima United', venue: 'Ch\u00fcmoukedima Football Stadium, Nagaland' },
    },
  };
  const photoImage = await sharp({ create: { width: 420, height: 524, channels: 3, background: '#9b664b' } }).png().toBuffer();
  const client = {
    from(table) {
      assert.equal(table, 'campaign_ids');
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({ data: row, error: null }),
      };
      return chain;
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, 'campaign_documents');
        return {
          createSignedUrl: async (path, expiresIn) => {
            assert.equal(path, 'synthetic/photo.png');
            assert.equal(expiresIn, 900);
            return { data: { signedUrl: 'https://storage.example.invalid/signed-photo' }, error: null };
          },
          download: async (path) => {
            assert.equal(path, 'synthetic/photo.png');
            return { data: new Blob([photoImage], { type: 'image/png' }), error: null };
          },
        };
      },
    },
  };
  const api = loadSource('apps/admin/src/actions/campaignAdminActions.ts', {
    '../utils/supabaseServerClient': {
      getSupabaseAdminClient: () => client,
      assertStaffRole: async () => ({ email: 'campaign-manager@example.invalid' }),
    },
    '../utils/campaignPassPdf': passPdfRenderer,
  });

  const originalFetch = globalThis.fetch;
  const originalEnvironment = Object.fromEntries(['NEXT_PUBLIC_SITE_URL', 'RESEND_API_KEY', 'CAMPAIGN_EMAIL_FROM']
    .map((name) => [name, process.env[name]]));
  process.env.NEXT_PUBLIC_SITE_URL = 'https://campaign.example.invalid';
  process.env.RESEND_API_KEY = 'synthetic-resend-key';
  process.env.CAMPAIGN_EMAIL_FROM = 'NUSC Passes <passes@nusc.example.invalid>';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    calls.push(JSON.parse(options.body));
    return new Response(JSON.stringify({ id: 'synthetic-email-id' }), { status: 200 });
  };
  try {
    const result = await api.emailCampaignPass('synthetic-application-id');
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    const attachments = calls[0].attachments;
    assert.equal(attachments.length, 2);
    const pdfAttachments = attachments.filter(({ content_type }) => content_type === 'application/pdf');
    const imageAttachments = attachments.filter(({ content_type }) => content_type === 'image/png');
    assert.equal(pdfAttachments.length, 1);
    assert.equal(imageAttachments.length, 1);
    assert.match(pdfAttachments[0].filename, /\.pdf$/i);
    assert.match(imageAttachments[0].filename, /\.png$/i);
    const emailedPdf = Buffer.from(pdfAttachments[0].content, 'base64');
    const pdfText = emailedPdf.toString('latin1');
    assert.match(pdfText, /^%PDF-1\.4/);
    assert.match(pdfText, /\/Count 1\b/);
    assert.equal((pdfText.match(/\/Type \/Page\b/g) || []).length, 1);
    assert.match(pdfText, /\/MediaBox \[0 0 243\.7795 408\.1890\]/);

    const preview = await api.prepareCampaignPassPreview('synthetic-application-id');
    assert.equal(preview.success, true);
    const adminPreviewSvg = Buffer.from(preview.svgBase64, 'base64').toString('utf8');
    for (const text of [
      'APPROVED', 'SPORTS PHOTOGRAPHER', 'Gate / Checkpoint',
      'Valid from', 'Valid until', 'Football Stadium, Nagaland',
    ]) assert.ok(adminPreviewSvg.toLowerCase().includes(text.toLowerCase()), `Admin preview should contain ${text}`);
    assert.doesNotMatch(adminPreviewSvg, /OTHER:\s*SPORTS PHOTOGRAPHER/i, 'Admin ID should show the specified role without the Other label');

    const pdfImage = extractPdfImage(emailedPdf);
    assert.equal(pdfImage.width, 1016);
    assert.equal(pdfImage.height, 1701);
    const expectedPixels = await sharp(await renderCampaignPassSvgToPng(adminPreviewSvg))
      .flatten({ background: '#ffffff' })
      .removeAlpha()
      .raw()
      .toBuffer();
    assert.deepEqual(pdfImage.pixels, expectedPixels, 'emailed PDF raster must exactly match the Admin preview SVG');
    assert.equal(await decodePdfQr(emailedPdf, adminPreviewSvg, 'pass-qr'), qrToken);
    assert.equal(await decodePdfQr(emailedPdf, adminPreviewSvg, 'terms-qr'), termsUrl);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
