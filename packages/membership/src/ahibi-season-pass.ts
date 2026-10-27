import { createHash, createHmac, randomUUID } from 'node:crypto';

export type AhibiSeasonPassId = 'general-season' | 'premium-season';
export type AhibiSeasonPassZone = 'G-1' | 'G-2' | 'G-3' | 'G-4' | 'G-5';

export interface AhibiSeasonPassReservation {
  reservationId: string;
  partnerOrderId: string;
  passId: AhibiSeasonPassId;
  status: 'held' | 'issuing' | 'issued' | 'replaced' | 'released' | 'expired';
  expiresAt: string;
  zone: AhibiSeasonPassZone | null;
}

export interface AhibiSeasonPassTicket {
  eventId: string;
  matchDate: string;
  opponent: string;
  ticketId: string;
  status: 'confirmed' | 'cancelled' | 'used';
  ticketType: 'General Pass' | 'Premium Pass';
  zone: AhibiSeasonPassZone | null;
  ticketAccessPath: string;
}

export interface AhibiSeasonPassIssuance {
  reservationId: string;
  partnerOrderId: string;
  paymentId: string;
  status: 'issued';
  tickets: AhibiSeasonPassTicket[];
}

export interface AhibiSeasonPassTicketDetails extends AhibiSeasonPassTicket {
  qrPayload: string;
}

export class AhibiSeasonPassError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
    this.name = 'AhibiSeasonPassError';
  }
}

interface AhibiConfig {
  baseUrl: URL;
  keyId: string;
  secret: string;
}

function config(): AhibiConfig {
  if (process.env.NUSC_AHIBI_SEASON_PASS_ENABLED !== 'true') {
    throw new AhibiSeasonPassError(503, 'AHIBI_SEASON_PASSES_DISABLED');
  }

  const mode = process.env.NUSC_AHIBI_PARTNER_MODE;
  if (mode !== 'test' && mode !== 'live') throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_MODE_NOT_CONFIGURED');
  if (mode === 'live' && process.env.NODE_ENV !== 'production') {
    throw new AhibiSeasonPassError(503, 'AHIBI_LIVE_API_BLOCKED_OUTSIDE_PRODUCTION');
  }
  if (mode === 'test' && process.env.VERCEL_ENV === 'production') {
    throw new AhibiSeasonPassError(503, 'AHIBI_TEST_API_BLOCKED_IN_PRODUCTION');
  }

  const suffix = mode === 'live' ? 'LIVE' : 'TEST';
  const rawBaseUrl = process.env[`AHIBI_PARTNER_${suffix}_BASE_URL`];
  const keyId = process.env[`NUSC_PARTNER_${suffix}_KEY_ID`];
  const secret = process.env[`NUSC_PARTNER_${suffix}_SECRET`];
  if (!rawBaseUrl || !keyId || !secret) throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_CONFIGURATION_MISSING');

  let baseUrl: URL;
  try { baseUrl = new URL(rawBaseUrl); }
  catch { throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_URL_INVALID'); }
  const isLocalTestHttp = mode === 'test' && process.env.NODE_ENV !== 'production'
    && process.env.VERCEL_ENV !== 'production' && baseUrl.protocol === 'http:'
    && ['localhost', '127.0.0.1', '[::1]'].includes(baseUrl.hostname);
  if ((baseUrl.protocol !== 'https:' && !isLocalTestHttp) || baseUrl.username || baseUrl.password
      || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash) {
    throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_URL_INVALID');
  }
  if (!/^[A-Za-z0-9._-]{1,120}$/.test(keyId) || secret.length < 32) {
    throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_CONFIGURATION_INVALID');
  }
  return { baseUrl, keyId, secret };
}

function object(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function requiredString(value: unknown, max = 500): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  return value;
}

function passId(value: unknown): AhibiSeasonPassId {
  if (value === 'general-season' || value === 'premium-season') return value;
  throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
}

function zone(value: unknown): AhibiSeasonPassZone | null {
  if (value === null || value === undefined) return null;
  if (value === 'G-1' || value === 'G-2' || value === 'G-3' || value === 'G-4' || value === 'G-5') return value;
  throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
}

function parseReservation(value: unknown): AhibiSeasonPassReservation {
  const row = object(value);
  const id = requiredString(row.reservationId, 100);
  const status = row.status;
  if (!/^nsp_[a-f0-9]{40}$/.test(id)
      || !['held', 'issuing', 'issued', 'replaced', 'released', 'expired'].includes(String(status))) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const expiresAt = requiredString(row.expiresAt, 80);
  if (!Number.isFinite(Date.parse(expiresAt))) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  return {
    reservationId: id,
    partnerOrderId: requiredString(row.partnerOrderId, 200),
    passId: passId(row.passId),
    status: status as AhibiSeasonPassReservation['status'],
    expiresAt,
    zone: zone(row.zone),
  };
}

function parseTicket(value: unknown): AhibiSeasonPassTicket {
  const row = object(value);
  const match = object(row.match);
  const ticketType = row.ticketType;
  const status = row.status;
  if ((ticketType !== 'General Pass' && ticketType !== 'Premium Pass')
      || (status !== 'confirmed' && status !== 'cancelled' && status !== 'used')) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const matchDate = requiredString(match.matchDate, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate) || !Number.isFinite(Date.parse(`${matchDate}T00:00:00Z`))) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const eventId = requiredString(match.eventId, 200);
  const ticketId = requiredString(row.ticketId, 200);
  const ticketAccessPath = requiredString(row.ticketAccessPath, 500);
  if (!/^\/api\/nusc-partner\/v1\/reservations\/nsp_[a-f0-9]{40}\/tickets\/[^/]+$/.test(ticketAccessPath)) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  return {
    eventId,
    matchDate,
    opponent: requiredString(match.opponent, 160),
    ticketId,
    status,
    ticketType,
    zone: zone(row.zone),
    ticketAccessPath,
  };
}

function parseTickets(value: unknown, options: { partial?: boolean } = {}): AhibiSeasonPassTicket[] {
  if (!Array.isArray(value) || (options.partial ? value.length < 1 || value.length > 10 : value.length !== 10)) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const tickets = value.map(parseTicket);
  if (new Set(tickets.map(ticket => ticket.eventId)).size !== tickets.length
      || new Set(tickets.map(ticket => ticket.ticketId)).size !== tickets.length) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  return tickets;
}

async function request(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const settings = config();
  if (!path.startsWith('/api/nusc-partner/v1/')) throw new AhibiSeasonPassError(500, 'AHIBI_PATH_INVALID');
  const rawBody = body === undefined ? '' : JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = randomUUID();
  const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const message = `${timestamp}\n${requestId}\n${method}\n${path}\n${bodyHash}`;
  const signature = createHmac('sha256', settings.secret).update(message, 'utf8').digest('hex');
  let response: Response;
  try {
    response = await fetch(new URL(path, settings.baseUrl), {
      method,
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'content-type': 'application/json',
        'x-ahibi-key-id': settings.keyId,
        'x-ahibi-timestamp': timestamp,
        'x-ahibi-request-id': requestId,
        'x-ahibi-signature': signature,
      },
      ...(method === 'POST' ? { body: rawBody } : {}),
    });
  } catch {
    throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_UNAVAILABLE');
  }

  let payload: Record<string, unknown>;
  try { payload = object(await response.json()); }
  catch { throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID'); }
  if (!response.ok || payload.success !== true) {
    const code = typeof payload.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(payload.code)
      ? payload.code
      : typeof payload.error === 'string' && /^[A-Z0-9_]{1,80}$/.test(payload.error)
        ? payload.error : `AHIBI_HTTP_${response.status}`;
    throw new AhibiSeasonPassError(response.status, code);
  }
  return payload;
}

function validateReservationSelection(
  reservation: AhibiSeasonPassReservation,
  expected: { partnerOrderId: string; passId: AhibiSeasonPassId; zone: AhibiSeasonPassZone | null },
) {
  if (reservation.partnerOrderId !== expected.partnerOrderId
      || reservation.passId !== expected.passId || reservation.zone !== expected.zone) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
}

export async function reserveAhibiSeasonPass(input: {
  partnerOrderId: string;
  memberReference: string;
  passId: AhibiSeasonPassId;
  zone: AhibiSeasonPassZone | null;
}): Promise<AhibiSeasonPassReservation> {
  if (!/^nusc-order-[a-f0-9-]{36}$/i.test(input.partnerOrderId)
      || !/^nusc-member-[a-f0-9-]{36}$/i.test(input.memberReference)
      || (input.passId === 'general-season' && !input.zone)
      || (input.passId === 'premium-season' && input.zone !== null)) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }
  const reservationRequest = {
    partnerOrderId: input.partnerOrderId,
    memberReference: input.memberReference,
    passId: input.passId,
    ...(input.zone ? { zone: input.zone } : {}),
  };
  const payload = await request('POST', '/api/nusc-partner/v1/season-pass/reservations', reservationRequest);
  const reservation = parseReservation(payload.reservation);
  validateReservationSelection(reservation, input);
  if (reservation.status !== 'held') throw new AhibiSeasonPassError(409, 'AHIBI_RESERVATION_NOT_HELD');
  const raw = object(payload.reservation);
  if (!Array.isArray(raw.matches) || raw.matches.length !== 10) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  return reservation;
}

export async function confirmAhibiSeasonPass(
  reservationId: string,
  paymentId: string,
  expected: { partnerOrderId: string; passId: AhibiSeasonPassId; zone: AhibiSeasonPassZone | null },
): Promise<AhibiSeasonPassIssuance> {
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }
  const payload = await request('POST', `/api/nusc-partner/v1/reservations/${reservationId}/confirm`, { paymentId });
  const rawIssuance = object(payload.issuance);
  const issuanceStatus = rawIssuance.status;
  if (issuanceStatus !== 'issued') throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  const issuedReservationId = requiredString(rawIssuance.reservationId, 100);
  const partnerOrderId = requiredString(rawIssuance.partnerOrderId, 200);
  const issuedPaymentId = requiredString(rawIssuance.paymentId, 200);
  const tickets = parseTickets(payload.tickets);
  if (issuedReservationId !== reservationId || partnerOrderId !== expected.partnerOrderId || issuedPaymentId !== paymentId) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  const expectedType = expected.passId === 'general-season' ? 'General Pass' : 'Premium Pass';
  if (tickets.some(ticket => ticket.status !== 'confirmed' || ticket.ticketType !== expectedType || ticket.zone !== expected.zone)) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  return { reservationId, partnerOrderId, paymentId, status: 'issued', tickets };
}

export async function replaceAhibiGeneralPass(input: {
  premiumReservationId: string;
  oldReservationId: string;
  paymentId: string;
  partnerOrderId: string;
  expectedEventIds: string[];
}): Promise<AhibiSeasonPassTicket[]> {
  if (!/^nsp_[a-f0-9]{40}$/.test(input.premiumReservationId)
      || !/^nsp_[a-f0-9]{40}$/.test(input.oldReservationId)
      || input.premiumReservationId === input.oldReservationId
      || !/^pay_[A-Za-z0-9]+$/.test(input.paymentId)
      || !/^nusc-order-[a-f0-9-]{36}$/i.test(input.partnerOrderId)
      || input.expectedEventIds.length !== 10 || new Set(input.expectedEventIds).size !== 10) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }

  const path = `/api/nusc-partner/v1/reservations/${input.premiumReservationId}/replace-general`;
  const payload = await request('POST', path, {
    oldReservationId: input.oldReservationId,
    paymentId: input.paymentId,
  });
  const tickets = parseTickets(payload.tickets, { partial: true });
  const replacementSummary = object(payload.replacement);
  const retainedUsedTicketCount = payload.retainedUsedTicketCount ?? replacementSummary.retainedUsedTicketCount;
  if (!Number.isInteger(retainedUsedTicketCount) || Number(retainedUsedTicketCount) < 0
      || Number(retainedUsedTicketCount) + tickets.length !== 10) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const expectedEvents = new Set(input.expectedEventIds);
  if (tickets.some(ticket => ticket.status !== 'confirmed' || ticket.ticketType !== 'Premium Pass'
      || ticket.zone !== null || !expectedEvents.has(ticket.eventId)
      || !ticket.ticketAccessPath.startsWith(`/api/nusc-partner/v1/reservations/${input.premiumReservationId}/tickets/`))) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  return tickets;
}

export async function recoverMissingAhibiGeneralTickets(input: {
  premiumReservationId: string;
  oldReservationId: string;
  paymentId: string;
  expectedMatches: Array<{ eventId: string; matchDate: string; opponent: string }>;
}): Promise<AhibiSeasonPassTicket[]> {
  if (!/^nsp_[a-f0-9]{40}$/.test(input.premiumReservationId)
      || !/^nsp_[a-f0-9]{40}$/.test(input.oldReservationId)
      || input.premiumReservationId === input.oldReservationId
      || !/^pay_[A-Za-z0-9]+$/.test(input.paymentId)
      || input.expectedMatches.length !== 10
      || new Set(input.expectedMatches.map(match => match.eventId)).size !== 10) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }

  const path = `/api/nusc-partner/v1/reservations/${input.premiumReservationId}/recover-missing-general-tickets`;
  const payload = await request('POST', path, {
    oldReservationId: input.oldReservationId,
    paymentId: input.paymentId,
  });
  const recovery = object(payload.recovery);
  const tickets = parseTickets(payload.tickets);
  const recoveredMatchIndices = recovery.recoveredMatchIndices;
  if (recovery.oldReservationId !== input.oldReservationId
      || recovery.premiumReservationId !== input.premiumReservationId
      || recovery.status !== 'issued'
      || recovery.issuedTicketCount !== 10
      || recovery.recoveredTicketCount !== 2
      || recovery.retainedUsedTicketCount !== 0
      || !Array.isArray(recoveredMatchIndices)
      || recoveredMatchIndices.length !== 2
      || recoveredMatchIndices[0] !== 1 || recoveredMatchIndices[1] !== 2) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }

  const expectedByEvent = new Map(input.expectedMatches.map(match => [match.eventId, match]));
  if (tickets.some(ticket => {
    const expected = expectedByEvent.get(ticket.eventId);
    return !expected || ticket.matchDate !== expected.matchDate || ticket.opponent !== expected.opponent
      || ticket.status !== 'confirmed' || ticket.ticketType !== 'Premium Pass' || ticket.zone !== null
      || !ticket.ticketAccessPath.startsWith(`/api/nusc-partner/v1/reservations/${input.premiumReservationId}/tickets/`);
  }) || new Set(tickets.map(ticket => ticket.eventId)).size !== 10) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  return tickets;
}

export async function getAhibiSeasonPassStatus(
  reservationId: string,
  expected: { partnerOrderId: string; passId: AhibiSeasonPassId; zone: AhibiSeasonPassZone | null },
): Promise<{ reservation: AhibiSeasonPassReservation; tickets: AhibiSeasonPassTicket[] }> {
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId)) throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  const payload = await request('GET', `/api/nusc-partner/v1/reservations/${reservationId}`);
  const reservation = parseReservation(payload.reservation);
  validateReservationSelection(reservation, expected);
  if (reservation.reservationId !== reservationId) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  const replacement = object(payload.replacement);
  const isReplacement = Object.keys(replacement).length > 0;
  if ((isReplacement && expected.passId !== 'premium-season')
      || (reservation.status === 'replaced' && expected.passId !== 'general-season')) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  let tickets: AhibiSeasonPassTicket[] = [];
  if (reservation.status === 'replaced') {
    if (!Array.isArray(payload.tickets) || payload.tickets.length !== 0) {
      throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
    }
  } else if (payload.tickets !== undefined) {
    // Holds that have expired or been released have no issued ticket records.
    // Keep the ten-ticket requirement for normal issued passes and the partial
    // count checks for completed General-to-Premium replacements below.
    if (Array.isArray(payload.tickets) && payload.tickets.length === 0 && reservation.status !== 'issued') {
      tickets = [];
    } else {
      tickets = parseTickets(payload.tickets, { partial: isReplacement });
    }
  }
  if (reservation.status === 'issued' && (tickets.length === 0 || (!isReplacement && tickets.length !== 10))) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  if (isReplacement && (!Number.isInteger(replacement.retainedUsedTicketCount)
      || Number(replacement.retainedUsedTicketCount) < 0 || Number(replacement.retainedUsedTicketCount) > 10
      || Number(replacement.retainedUsedTicketCount) + tickets.length !== 10)) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  if (tickets.length && tickets.some(ticket => ticket.ticketType !== (expected.passId === 'general-season' ? 'General Pass' : 'Premium Pass')
      || ticket.zone !== expected.zone)) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  return { reservation, tickets };
}

export async function releaseAhibiSeasonPass(reservationId: string): Promise<void> {
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId)) throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  await request('POST', `/api/nusc-partner/v1/reservations/${reservationId}/release`, {});
}

export async function getAhibiSeasonPassTicket(
  reservationId: string,
  bookingId: string,
  expected: AhibiSeasonPassTicket,
): Promise<AhibiSeasonPassTicketDetails> {
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId) || !/^[A-Za-z0-9_-]{1,200}$/.test(bookingId)) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }
  const payload = await request('GET', `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${encodeURIComponent(bookingId)}`);
  const rawTicket = payload.ticket === undefined ? payload : object(payload.ticket);
  const match = object(rawTicket.match);
  const namedOpponent = rawTicket.opponent ?? match.opponent ?? rawTicket.matchName;
  const eventName = typeof rawTicket.eventName === 'string' ? rawTicket.eventName : '';
  const eventNameOpponent = /\bvs\.?\s+(.+)$/i.exec(eventName)?.[1]?.trim();
  const ticket = parseTicket({
    match: {
      eventId: rawTicket.eventId ?? match.eventId,
      matchDate: rawTicket.matchDate ?? match.matchDate,
      opponent: namedOpponent ?? eventNameOpponent ?? expected.opponent,
    },
    ticketId: rawTicket.bookingId ?? rawTicket.ticketId,
    status: rawTicket.status === 'checked-in' ? 'used' : rawTicket.status,
    ticketType: rawTicket.ticketType,
    zone: rawTicket.zone,
    ticketAccessPath: expected.ticketAccessPath,
  });
  const rawQrPayload = rawTicket.qrPayload;
  let qrPayload: string;
  if (typeof rawQrPayload === 'string') {
    qrPayload = requiredString(rawQrPayload, 10_000);
  } else {
    const qr = object(rawQrPayload);
    if (requiredString(qr.bookingId, 200) !== bookingId
        || requiredString(qr.eventId, 200) !== expected.eventId
        || requiredString(qr.ticketType, 160) !== expected.ticketType
        || qr.quantity !== 1) {
      throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
    }
    qrPayload = JSON.stringify({
      bookingId: qr.bookingId,
      eventId: qr.eventId,
      ticketType: qr.ticketType,
      quantity: qr.quantity,
    });
  }
  if (ticket.ticketId !== bookingId || ticket.eventId !== expected.eventId
      || ticket.matchDate !== expected.matchDate || ticket.ticketType !== expected.ticketType
      || ticket.zone !== expected.zone || ticket.opponent !== expected.opponent) {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_MISMATCH');
  }
  return { ...ticket, qrPayload };
}

export async function getAhibiSeasonPassTicketPdf(
  reservationId: string,
  bookingId: string,
  attendee: { name: string; email: string; phone: string },
): Promise<ArrayBuffer> {
  if (!/^nsp_[a-f0-9]{40}$/.test(reservationId) || !/^[A-Za-z0-9_-]{1,200}$/.test(bookingId)) {
    throw new AhibiSeasonPassError(400, 'AHIBI_REQUEST_INVALID');
  }
  const name = attendee.name.trim();
  const email = attendee.email.trim();
  const phone = attendee.phone.trim();
  if (!name || name.length > 100 || /[\u0000-\u001F\u007F]/.test(name)
      || !email || email.length > 254 || /\s/.test(email) || !/^[^@]+@[^@]+\.[^@]+$/.test(email)
      || !phone || phone.length > 40 || !/^\+?[0-9][0-9().\s-]{4,38}$/.test(phone)
      || phone.replace(/\D/g, '').length < 5) {
    throw new AhibiSeasonPassError(400, 'AHIBI_ATTENDEE_INVALID');
  }

  const settings = config();
  const path = `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${encodeURIComponent(bookingId)}/pdf`;
  const rawBody = JSON.stringify({ attendee: { name, email, phone } });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = randomUUID();
  const bodyHash = createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const message = `${timestamp}\n${requestId}\nPOST\n${path}\n${bodyHash}`;
  const signature = createHmac('sha256', settings.secret).update(message, 'utf8').digest('hex');

  let response: Response;
  try {
    response = await fetch(new URL(path, settings.baseUrl), {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'content-type': 'application/json',
        'x-ahibi-key-id': settings.keyId,
        'x-ahibi-timestamp': timestamp,
        'x-ahibi-request-id': requestId,
        'x-ahibi-signature': signature,
      },
      body: rawBody,
    });
  } catch {
    throw new AhibiSeasonPassError(503, 'AHIBI_PARTNER_UNAVAILABLE');
  }

  if (!response.ok) {
    let code = `AHIBI_HTTP_${response.status}`;
    try {
      const payload = object(await response.json());
      if (typeof payload.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(payload.code)) code = payload.code;
      else if (typeof payload.error === 'string' && /^[A-Z0-9_]{1,80}$/.test(payload.error)) code = payload.error;
    } catch { /* Keep the status-derived code for a non-JSON error response. */ }
    throw new AhibiSeasonPassError(response.status, code);
  }

  if (response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/pdf') {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024) {
        await reader.cancel();
        throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof AhibiSeasonPassError) throw error;
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (size < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') {
    throw new AhibiSeasonPassError(502, 'AHIBI_RESPONSE_INVALID');
  }
  return bytes.buffer;
}
