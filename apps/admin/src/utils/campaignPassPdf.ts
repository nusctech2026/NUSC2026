import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import { CAMPAIGN_PASS_CREST_PNG } from './campaignPassCrest';

export const CAMPAIGN_PASS_WIDTH_MM = 86;
export const CAMPAIGN_PASS_HEIGHT_MM = 144;

const SVG_WIDTH = 860;
const SVG_HEIGHT = 1440;
const RENDER_DPI = 300;
const SANS_FONT = 'Arimo, Arial, Helvetica, sans-serif';
const MONO_FONT = 'Cousine, Courier New, monospace';
const FONT_FILES = ['Arimo-Variable.ttf', 'Cousine-Regular.ttf', 'Cousine-Bold.ttf'];

function getBundledFontPaths() {
  return FONT_FILES.map((filename) => {
    const candidates = [
      resolve(process.cwd(), 'src/utils/fonts', filename),
      resolve(process.cwd(), 'apps/admin/src/utils/fonts', filename),
    ];
    const fontPath = candidates.find((candidate) => existsSync(candidate));
    if (!fontPath) throw new Error('The bundled Workforce ID font could not be loaded: ' + filename);
    return fontPath;
  });
}
const DEPARTMENT_LABELS: Record<string, string> = {
  ahibi: 'Ahibi',
  volunteer: 'Volunteers',
  media: 'Press and Media',
  crew: 'Crew',
  management: 'Management',
  officials: 'Match Officials',
  medical: 'Medical Team',
};

export interface CampaignPassCardData {
  fullName: string;
  registrationId: string;
  idNumber: string;
  category: string;
  accreditationType: string;
  assignedRole: string;
  assignedMatch: string;
  assignedZone: string;
  validFrom: string;
  validUntil: string;
  eventVenue: string;
  status?: 'active' | 'scheduled' | 'expired';
  photoImage: Buffer;
  qrImage: Buffer;
  termsQrImage?: Buffer;
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[character]!));
}

function splitLines(value: string, maxCharacters: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (word.length > maxCharacters) {
      if (line) lines.push(line);
      line = '';
      for (let index = 0; index < word.length; index += maxCharacters) {
        lines.push(word.slice(index, index + maxCharacters));
      }
      continue;
    }
    const next = line ? line + ' ' + word : word;
    if (next.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['Not set'];
}

function fitText(value: string, width: number, size: number, maxLines: number, averageCharacterWidth = 0.58) {
  let fontSize = size;
  let lines = splitLines((value || 'Not set').trim(), Math.max(1, Math.floor(width / (fontSize * averageCharacterWidth))));
  while (lines.length > maxLines && fontSize > 14) {
    fontSize -= 1;
    lines = splitLines((value || 'Not set').trim(), Math.max(1, Math.floor(width / (fontSize * averageCharacterWidth))));
  }
  return { lines, fontSize };
}

function svgText(
  value: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color: string,
  weight: number,
  maxLines = 1,
  lineHeight = Math.round(size * 1.16),
  letterSpacing = 0,
  fontFamily = SANS_FONT,
  averageCharacterWidth = 0.58,
) {
  const fitted = fitText(value, width, size, maxLines, averageCharacterWidth);
  const resolvedLineHeight = Math.max(lineHeight, Math.round(fitted.fontSize * 1.16));
  return fitted.lines.map((line, index) =>
    '<text x="' + x + '" y="' + (y + index * resolvedLineHeight) + '" fill="' + color
      + '" font-family="' + fontFamily + '" font-size="' + fitted.fontSize + '" font-weight="' + weight
      + '" letter-spacing="' + letterSpacing + '">' + escapeXml(line) + '</text>',
  ).join('');
}

function formatPassDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  }).format(date);
}

function dataUri(contentType: string, bytes: Buffer) {
  return 'data:' + contentType + ';base64,' + bytes.toString('base64');
}

function infoIcon(name: string, x: number, y: number) {
  const paths: Record<string, string> = {
    access: '<path d="M4 7.5h16v12H4z"/><path d="M8 7.5V5h8v2.5M8 12h4M8 15h8"/>',
    zone: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.2"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="1.5"/><path d="M8 3v5M16 3v5M4 10h16M8 14h3M8 17h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    venue: '<path d="M3 9 12 4l9 5v10H3z"/><path d="M6 19v-6h12v6M8 10h.01M12 10h.01M16 10h.01M10 13v6M14 13v6"/>',
  };
  return '<svg x="' + x + '" y="' + y + '" width="36" height="36" viewBox="0 0 24 24" fill="none"'
    + ' stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + (paths[name] || paths.access) + '</svg>';
}

function infoFieldSvg(
  field: { label: string; value: string; icon: string; note?: string },
  x: number,
  y: number,
  width: number,
  height: number,
  valueLayout: { lines: string[]; fontSize: number },
) {
  const labelX = x + 84.7;
  const labelLineHeight = 18.56;
  const noteLineHeight = 15.88;
  const valueLineHeight = 23.9;
  const copyGap = 2.65;
  const valueSize = 21.17;
  const valueTopOffset = Math.max(0, (height - (
    labelLineHeight + copyGap + (field.note ? copyGap + noteLineHeight : 0) + valueLayout.lines.length * valueLineHeight
  )) / 2);
  const labelBaseline = y + valueTopOffset + 14.2;
  const label = '<text x="' + labelX + '" y="' + labelBaseline + '" fill="#53627a"'
    + ' font-family="' + SANS_FONT + '" font-size="17.2" font-weight="900" letter-spacing=".7">'
    + escapeXml(field.label.toUpperCase()) + '</text>';
  const note = field.note
    ? '<text x="' + labelX + '" y="' + (y + valueTopOffset + labelLineHeight + copyGap + 12.3) + '" fill="#68768c" font-family="' + SANS_FONT + '"'
      + ' font-size="15.9" font-weight="600">' + escapeXml(field.note) + '</text>'
    : '';
  const valueTop = valueTopOffset + labelLineHeight + copyGap + (field.note ? copyGap + noteLineHeight : 0);
  const valueY = y + valueTop + valueSize * 0.84;
  const value = svgText(field.value, labelX, valueY, width - 92, valueSize, '#0c1d38', 800, 3, valueLineHeight, 0, SANS_FONT, 0.63);
  const iconTabX = x + 15.9;
  const iconTabY = y + (height - 58.2) / 2;
  const iconLeft = iconTabX + 11;
  const iconY = iconTabY + 11;
  return '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="' + height
    + '" rx="13" fill="#fff" fill-opacity=".88" stroke="#7386a3" stroke-width="2.65"/>'
    + '<path d="M' + iconTabX + ' ' + iconTabY + 'h58.2l-15.1 58.2h-43.1Z" fill="#091d3b"/>'
    + infoIcon(field.icon, iconLeft, iconY)
    + label + note + value;
}

export async function renderCampaignPassCardSvg(data: CampaignPassCardData) {
  const [photo, qr, termsQr] = await Promise.all([
    sharp(data.photoImage).rotate().resize({ width: 420, height: 524, fit: 'cover' })
      .jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer(),
    sharp(data.qrImage).png().toBuffer(),
    data.termsQrImage ? sharp(data.termsQrImage).png().toBuffer() : Promise.resolve(null),
  ]);
  const crest = CAMPAIGN_PASS_CREST_PNG;
  const department = DEPARTMENT_LABELS[data.category] || data.category || 'Workforce';
  const status = data.status || 'active';
  const statusLabel = status === 'expired' ? 'EXPIRED' : status === 'scheduled' ? 'SCHEDULED' : 'APPROVED';
  const statusBackground = status === 'expired' ? '#b4232d' : status === 'scheduled' ? '#f4c95d' : '#17472f';
  const statusForeground = status === 'scheduled' ? '#10233f' : '#fff';
  const statusBorder = status === 'expired' ? '#ffb4ba' : status === 'scheduled' ? '#fff0bd' : '#89c4a3';
  const identityX = 257;
  const identityWidth = 572;
  const nameLayout = fitText(data.fullName, identityWidth, 42, 2);
  const nameBaseline = 462 + (nameLayout.lines.length - 1) * 44;
  const roleTextWidth = identityWidth - 42 - 60;
  const roleLayout = fitText((data.assignedRole || 'Workforce staff').toUpperCase(), roleTextWidth, 21, 2, 0.8);
  const roleTop = nameBaseline + 23;
  const roleHeight = 26 + roleLayout.lines.length * 25;
  const passBaseline = roleTop + roleHeight + 38;
  const registrationBaseline = passBaseline + 26;
  const profileBottom = Math.max(623, registrationBaseline + 10);
  const detailsTop = profileBottom + 17;
  const fieldX = 31.75;
  const fieldWidth = 391.63;
  const fieldGapX = 13.23;
  const fieldGapY = 13.23;
  const fields = [
    { label: 'Match access', value: data.assignedMatch || 'All NUSC home matches', note: data.accreditationType || 'Match-day pass', icon: 'access' },
    { label: 'Gate / Checkpoint', value: data.assignedZone || 'To be assigned', icon: 'zone' },
    { label: 'Valid from', value: formatPassDate(data.validFrom), icon: 'calendar' },
    { label: 'Valid until', value: formatPassDate(data.validUntil), icon: 'clock' },
    { label: 'Venue', value: data.eventVenue || 'Chumukedima Football Stadium, Nagaland', icon: 'venue' },
  ];
  const fullRowWidth = fieldWidth * 2 + fieldGapX;
  const rowCount = Math.ceil(fields.length / 2);
  const valueLayouts = fields.map((field, index) => {
    const spansFullRow = fields.length % 2 === 1 && index === fields.length - 1;
    return fitText(field.value, (spansFullRow ? fullRowWidth : fieldWidth) - 92, 21.17, 3, 0.63);
  });
  const copyHeight = fields.map((field, index) =>
    18.56 + 2.65 + (field.note ? 2.65 + 15.88 : 0) + valueLayouts[index].lines.length * 23.9,
  );
  const rowHeights = Array.from({ length: rowCount }, (_, row) => Math.max(
    92.61,
    ...copyHeight.slice(row * 2, row * 2 + 2).map(height => height + 26.46),
  ));
  const rowTops = [detailsTop];
  for (let row = 1; row < rowHeights.length; row += 1) {
    rowTops[row] = rowTops[row - 1] + rowHeights[row - 1] + fieldGapY;
  }
  const fieldSvg = fields.map((field, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const spansFullRow = fields.length % 2 === 1 && index === fields.length - 1;
    const x = spansFullRow ? fieldX : fieldX + column * (fieldWidth + fieldGapX);
    const width = spansFullRow ? fullRowWidth : fieldWidth;
    return infoFieldSvg(field, x, rowTops[row], width, rowHeights[row], valueLayouts[index]);
  }).join('');
  const detailsBottom = rowTops[rowCount - 1] + rowHeights[rowCount - 1];
  const qrFrameSize = 243.42;
  const qrImageSize = 211.67;
  const qrFrameX = (SVG_WIDTH - qrFrameSize) / 2;
  const qrFrameY = detailsBottom + 18.15;
  const qrImageX = (SVG_WIDTH - qrImageSize) / 2;
  const qrImageY = qrFrameY + (qrFrameSize - qrImageSize) / 2;
  const qrTitleY = qrFrameY + qrFrameSize + 22;
  const qrNoteY = qrTitleY + 27;
  const photoUri = dataUri('image/jpeg', photo);
  const qrUri = dataUri('image/png', qr);
  const termsQrUri = termsQr ? dataUri('image/png', termsQr) : null;
  const termsQrFrameSize = 174;
  const termsQrImageSize = 142;
  const termsQrFrameX = SVG_WIDTH - 42 - termsQrFrameSize;
  const termsQrFrameY = qrFrameY + (qrFrameSize - termsQrFrameSize) / 2;
  const termsQrImageX = termsQrFrameX + (termsQrFrameSize - termsQrImageSize) / 2;
  const termsQrImageY = termsQrFrameY + (termsQrFrameSize - termsQrImageSize) / 2;
  const crestUri = dataUri('image/png', crest);
  const desc = [
    department, data.assignedRole, data.assignedMatch, data.assignedZone,
    formatPassDate(data.validFrom), formatPassDate(data.validUntil), data.eventVenue,
  ].filter(Boolean).map(escapeXml).join(', ');

  const parts = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + CAMPAIGN_PASS_WIDTH_MM + 'mm" height="' + CAMPAIGN_PASS_HEIGHT_MM
      + 'mm" viewBox="0 0 ' + SVG_WIDTH + ' ' + SVG_HEIGHT + '" role="img" aria-labelledby="pass-title pass-description">',
    '<title id="pass-title">Approved NUSC workforce ID for ' + escapeXml(data.fullName) + '</title>',
    '<desc id="pass-description">' + desc + '. Entry and attendance QR is embedded. A separate QR links to the Terms and Conditions page.</desc>',
    '<defs>',
    '<linearGradient id="id-header" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#071832"/><stop offset=".72" stop-color="#102b52"/><stop offset="1" stop-color="#0a2143"/></linearGradient>',
    '<linearGradient id="id-body" x1="0" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".62" stop-color="#fbfcfe"/><stop offset="1" stop-color="#f0f4f9"/></linearGradient>',
    '<linearGradient id="id-slot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f8fa"/><stop offset="1" stop-color="#d9dee7"/></linearGradient>',
    '<clipPath id="card-clip"><rect x="2" y="2" width="856" height="1436" rx="28"/></clipPath>',
    '<clipPath id="photo-clip"><rect x="32" y="374" width="197" height="245" rx="24"/></clipPath>',
    '</defs>',
    '<rect x="2" y="2" width="856" height="1436" rx="28" fill="#fff" stroke="#091d3b" stroke-width="4"/>',
    '<g clip-path="url(#card-clip)">',
    '<path d="M0 29Q0 0 29 0H831Q860 0 860 29V346H0Z" fill="url(#id-header)"/>',
    '<rect x="0" y="336" width="860" height="10" fill="#e21e2b"/>',
    '<path d="M687 0h46L585 346h-46Z" fill="#264d80" fill-opacity=".34"/>',
    '<path d="M751 0h32L645 346h-32Z" fill="#264d80" fill-opacity=".36"/>',
    '<path d="M813 0h47v118L752 346h-45Z" fill="#e21e2b" fill-opacity=".94"/>',
    '<rect x="340" y="21" width="180" height="37" rx="19" fill="url(#id-slot)" stroke="#aab4c4" stroke-width="3"/>',
    '<image x="34" y="104" width="138" height="157" preserveAspectRatio="xMidYMid meet" href="' + crestUri + '"/>',
    '<path d="M186 128v114" stroke="#fff" stroke-opacity=".62" stroke-width="2"/>',
    '<text x="207" y="170" fill="#fff" font-family="' + SANS_FONT + '" font-size="33" font-weight="900" letter-spacing="1.3">NAGALAND</text>',
    '<text x="207" y="207" fill="#fff" font-family="' + SANS_FONT + '" font-size="33" font-weight="900" letter-spacing="1.3">UNITED SC</text>',
    '<text x="207" y="244" fill="#e7edf5" font-family="' + SANS_FONT + '" font-size="20" font-weight="700" letter-spacing="2.4">OFFICIAL MATCHDAY ID</text>',
    '<rect x="688" y="146" width="137" height="54" rx="8" fill="' + statusBackground + '" stroke="' + statusBorder + '" stroke-width="3"/>',
    '<text x="756.5" y="180" fill="' + statusForeground + '" text-anchor="middle" font-family="' + SANS_FONT + '" font-size="18" font-weight="900" letter-spacing=".7">' + statusLabel + '</text>',
    '<rect x="0" y="346" width="860" height="1094" fill="url(#id-body)"/>',
    '<svg x="0" y="782" width="860" height="628" viewBox="0 0 340 240" preserveAspectRatio="none" opacity=".72" aria-hidden="true">',
    '<path d="M0 147 70 93l25 20 46-53 53 53 36-28 53 47 57-29v137H0Z" fill="#f4f7fb"/>',
    '<path d="m69 94 26 19 46-53 25 26-25-9-18 24-17-5-13 21-24-11-19 12-30 1Z" fill="#e7edf5"/>',
    '<path d="m136 61 37 51 21-22 36 28 53-9 57 29" fill="none" stroke="#d4deeb" stroke-width="2"/>',
    '<path d="M0 162q44-18 86 0t84 0 84 0 86 0" fill="none" stroke="#d7dfeb" stroke-width="2"/>',
    '<path d="M0 173q44-18 86 0t84 0 84 0 86 0" fill="none" stroke="#e2e8f0" stroke-width="2"/>',
    '<path d="M286 93V42m-12 6h24m-20 0-7 9m23-9 7 9m-21-2-7 9m23-9 7 9" fill="none" stroke="#c5d1e0" stroke-width="2"/>',
    '<path d="M0 184q55-10 110 0t110 0 120 0v56H0Z" fill="#eff3f8"/>',
    '<path d="M0 196h340M0 205h340M0 214h340" stroke="#d9e1ec" stroke-width="1"/>',
    '</svg>',
    '<rect x="30" y="372" width="201" height="249" rx="26" fill="#e8edf4" stroke="#aab9ce" stroke-width="3"/>',
    '<image x="32" y="374" width="197" height="245" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo-clip)" href="' + photoUri + '"/>',
    '<text x="' + identityX + '" y="414" fill="#d71927" font-family="' + SANS_FONT + '" font-size="23.8" font-weight="900" letter-spacing="1.4">' + escapeXml(department.toUpperCase()) + '</text>',
    svgText(data.fullName, identityX, nameBaseline, identityWidth, 42.3, '#091d3b', 900, 2, 44),
    '<path d="M' + identityX + ' ' + roleTop + 'H' + (identityX + identityWidth) + 'L' + (identityX + identityWidth - 34) + ' ' + (roleTop + roleHeight) + 'H' + identityX + 'Z" fill="#e21e2b"/>',
    svgText((data.assignedRole || 'Workforce staff').toUpperCase(), identityX + 21, roleTop + 29, roleTextWidth, 21.17, '#fff', 900, 2, 24.56, 0.8, SANS_FONT, 0.8),
    '<text x="' + identityX + '" y="' + passBaseline + '" fill="#56657d" font-family="' + SANS_FONT + '" font-size="18.5" font-weight="800" letter-spacing="1.3">WORKFORCE ID</text>',
    svgText(data.idNumber || data.registrationId, identityX + 190, passBaseline, identityWidth - 190, 26.46, '#091d3b', 900, 1, 30.4, 0, MONO_FONT),
    data.registrationId && data.registrationId !== data.idNumber
      ? '<text x="' + identityX + '" y="' + registrationBaseline + '" fill="#64748b" font-family="' + SANS_FONT + '" font-size="18.5" font-weight="700">Application ' + escapeXml(data.registrationId) + '</text>'
      : '',
    fieldSvg,
    '<rect x="' + qrFrameX + '" y="' + qrFrameY + '" width="' + qrFrameSize + '" height="' + qrFrameSize + '" rx="11" fill="#fff" stroke="#bdc9d9" stroke-width="3"/>',
    '<image id="pass-qr" x="' + qrImageX + '" y="' + qrImageY + '" width="' + qrImageSize + '" height="' + qrImageSize + '" preserveAspectRatio="xMidYMid meet" href="' + qrUri + '"/>',
    '<path d="M' + (qrFrameX - 5) + ' ' + (qrFrameY + 25) + 'V' + (qrFrameY - 4) + 'H' + (qrFrameX + 25)
      + 'M' + (qrFrameX + qrFrameSize - 25) + ' ' + (qrFrameY - 4) + 'H' + (qrFrameX + qrFrameSize + 4)
      + 'V' + (qrFrameY + 25) + 'M' + (qrFrameX - 5) + ' ' + (qrFrameY + qrFrameSize - 25)
      + 'V' + (qrFrameY + qrFrameSize + 4) + 'H' + (qrFrameX + 25)
      + 'M' + (qrFrameX + qrFrameSize - 25) + ' ' + (qrFrameY + qrFrameSize + 4)
      + 'H' + (qrFrameX + qrFrameSize + 4) + 'V' + (qrFrameY + qrFrameSize - 25)
      + '" fill="none" stroke="#e21e2b" stroke-width="5" stroke-linecap="square"/>',
    termsQrUri
      ? '<rect x="' + termsQrFrameX + '" y="' + termsQrFrameY + '" width="' + termsQrFrameSize + '" height="' + termsQrFrameSize
        + '" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>'
        + '<image id="terms-qr" x="' + termsQrImageX + '" y="' + termsQrImageY + '" width="' + termsQrImageSize
        + '" height="' + termsQrImageSize + '" preserveAspectRatio="xMidYMid meet" href="' + termsQrUri + '"/>'
        + '<text x="' + (termsQrFrameX + termsQrFrameSize / 2) + '" y="' + qrTitleY + '" fill="#53627a" text-anchor="middle"'
        + ' font-family="' + SANS_FONT + '" font-size="14" font-weight="900" letter-spacing=".3">TERMS &amp; CONDITIONS</text>'
      : '',
    '<text x="430" y="' + qrTitleY + '" fill="#091d3b" text-anchor="middle" font-family="' + SANS_FONT + '" font-size="18" font-weight="900" letter-spacing="1.4">ENTRY &amp; ATTENDANCE QR</text>',
    '<text x="430" y="' + qrNoteY + '" fill="#53627a" text-anchor="middle" font-family="' + SANS_FONT + '" font-size="16" font-weight="600">Non-transferable \u00b7 scan this same ID on every authorized match day.</text>',
    '<svg x="0" y="1366" width="860" height="72" viewBox="0 0 340 28" preserveAspectRatio="none" aria-hidden="true">',
    '<path d="M0 7 80 18Q170 28 260 18l80-11v21H0Z" fill="#091d3b"/>',
    '<path d="M0 7 80 18Q170 27 260 18l80-11v5l-80 12Q170 33 80 23L0 12Z" fill="#e21e2b"/>',
    '</svg>',
    '</g>',
    '</svg>',
  ];
  return parts.join('\n');
}

function createSinglePagePdf(rgbPixels: Buffer, pixelWidth: number, pixelHeight: number) {
  const pageWidth = CAMPAIGN_PASS_WIDTH_MM / 25.4 * 72;
  const pageHeight = CAMPAIGN_PASS_HEIGHT_MM / 25.4 * 72;
  const imageBytes = deflateSync(rgbPixels, { level: 9 });
  const content = Buffer.from('q\n' + pageWidth.toFixed(4) + ' 0 0 ' + pageHeight.toFixed(4) + ' 0 0 cm\n/IdCard Do\nQ\n', 'ascii');
  const chunks: Buffer[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const append = (part: Buffer) => { chunks.push(part); length += part.length; };
  const appendText = (part: string) => append(Buffer.from(part, 'ascii'));
  const object = (id: number, body: string) => {
    offsets[id] = length;
    appendText(id + ' 0 obj\n' + body + '\nendobj\n');
  };
  const streamObject = (id: number, dictionary: string, bytes: Buffer) => {
    offsets[id] = length;
    appendText(id + ' 0 obj\n' + dictionary.replace('{length}', String(bytes.length)) + '\nstream\n');
    append(bytes);
    appendText('\nendstream\nendobj\n');
  };

  append(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary'));
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageWidth.toFixed(4) + ' ' + pageHeight.toFixed(4)
    + '] /Resources << /XObject << /IdCard 4 0 R >> >> /Contents 5 0 R >>');
  streamObject(4, '<< /Type /XObject /Subtype /Image /Width ' + pixelWidth + ' /Height ' + pixelHeight
    + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length {length} >>', imageBytes);
  streamObject(5, '<< /Length {length} >>', content);

  const xrefOffset = length;
  appendText('xref\n0 ' + offsets.length + '\n0000000000 65535 f \n');
  for (let id = 1; id < offsets.length; id += 1) appendText(String(offsets[id]).padStart(10, '0') + ' 00000 n \n');
  appendText('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n');
  return Buffer.concat(chunks);
}

export async function renderCampaignPassSvgToPng(svg: string) {
  const width = Math.round(CAMPAIGN_PASS_WIDTH_MM / 25.4 * RENDER_DPI);
  const height = Math.round(CAMPAIGN_PASS_HEIGHT_MM / 25.4 * RENDER_DPI);
  const rendered = new Resvg(svg, {
    dpi: RENDER_DPI,
    font: {
      loadSystemFonts: false,
      fontFiles: getBundledFontPaths(),
      defaultFontFamily: 'Arimo',
      sansSerifFamily: 'Arimo',
      monospaceFamily: 'Cousine',
    },
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 0,
  }).render();
  if (rendered.width !== width || rendered.height !== height) {
    throw new Error('The workforce ID could not be rendered at print resolution.');
  }
  return rendered.asPng();
}

export async function renderCampaignPassPdfFromPng(png: Buffer) {
  const width = Math.round(CAMPAIGN_PASS_WIDTH_MM / 25.4 * RENDER_DPI);
  const height = Math.round(CAMPAIGN_PASS_HEIGHT_MM / 25.4 * RENDER_DPI);
  const { data: pixels, info } = await sharp(png)
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height || info.channels !== 3) {
    throw new Error('The workforce ID could not be rasterized at print resolution.');
  }
  return createSinglePagePdf(pixels, info.width, info.height);
}

export async function renderCampaignPassPdfFromSvg(svg: string) {
  return renderCampaignPassPdfFromPng(await renderCampaignPassSvgToPng(svg));
}

export async function renderCampaignPassPdf(data: CampaignPassCardData) {
  const svg = await renderCampaignPassCardSvg(data);
  return renderCampaignPassPdfFromSvg(svg);
}
