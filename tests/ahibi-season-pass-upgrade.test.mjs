import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const reservationId = `nsp_${'a'.repeat(40)}`;
const oldReservationId = `nsp_${'b'.repeat(40)}`;
const paymentId = 'pay_smokeupgrade';
const partnerOrderId = 'nusc-order-11111111-1111-4111-8111-111111111111';
const eventIds = Array.from({ length: 10 }, (_, i) => `event-${i + 1}`);
const secret = 'test-partner-secret-with-at-least-thirty-two-bytes';
const tickets = (count, reservation = reservationId) => Array.from({ length: count }, (_, i) => ({
  match: { matchIndex: i + 1, eventId: eventIds[i], matchDate: `2027-01-${String(i + 1).padStart(2, '0')}`, opponent: `Opponent ${i + 1}` },
  ticketId: `booking-${i + 1}`, status: 'confirmed', ticketType: 'Premium Pass',
  ticketAccessPath: `/api/nusc-partner/v1/reservations/${reservation}/tickets/booking-${i + 1}`,
}));

async function loadWithFetch(fetchImpl) {
  const source = await readFile(new URL('../packages/membership/src/ahibi-season-pass.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  new Function('require', 'module', 'exports', outputText)(require, loaded, loaded.exports);
  return { ...loaded.exports, restoreFetch: () => { globalThis.fetch = originalFetch; } };
}

async function withPartnerEnv(run) {
  const keys = ['NUSC_AHIBI_SEASON_PASS_ENABLED', 'NUSC_AHIBI_PARTNER_MODE', 'AHIBI_PARTNER_TEST_BASE_URL',
    'NUSC_PARTNER_TEST_KEY_ID', 'NUSC_PARTNER_TEST_SECRET', 'NODE_ENV', 'VERCEL_ENV'];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    NUSC_AHIBI_SEASON_PASS_ENABLED: 'true', NUSC_AHIBI_PARTNER_MODE: 'test',
    AHIBI_PARTNER_TEST_BASE_URL: 'http://localhost:5001', NUSC_PARTNER_TEST_KEY_ID: 'nusc-test',
    NUSC_PARTNER_TEST_SECRET: secret, NODE_ENV: 'development',
  });
  delete process.env.VERCEL_ENV;
  try { await run(); }
  finally { for (const key of keys) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key]; }
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('upgrade replacement signs the exact path and body and accepts the returned partial Premium tickets', async () => {
  let request;
  const module = await loadWithFetch(async (url, init) => {
    request = { url: String(url), init };
    return jsonResponse(201, { success: true, retainedUsedTicketCount: 1, cancelledGeneralTicketCount: 9, tickets: tickets(9) });
  });
  try { await withPartnerEnv(async () => {
    const issued = await module.replaceAhibiGeneralPass({
      premiumReservationId: reservationId, oldReservationId, paymentId, partnerOrderId, expectedEventIds: eventIds,
    });
    assert.equal(issued.length, 9);
    assert.equal(request.url, `http://localhost:5001/api/nusc-partner/v1/reservations/${reservationId}/replace-general`);
    assert.equal(request.init.method, 'POST');
    assert.deepEqual(JSON.parse(request.init.body), { oldReservationId, paymentId });
    const timestamp = request.init.headers['x-ahibi-timestamp'];
    const requestId = request.init.headers['x-ahibi-request-id'];
    const bodyHash = createHash('sha256').update(request.init.body).digest('hex');
    const message = `${timestamp}\n${requestId}\nPOST\n/api/nusc-partner/v1/reservations/${reservationId}/replace-general\n${bodyHash}`;
    assert.equal(request.init.headers['x-ahibi-signature'], createHmac('sha256', secret).update(message).digest('hex'));
  }); } finally { module.restoreFetch(); }
});

test('missing Premium recovery signs its request and accepts only the complete ten-ticket response', async () => {
  let request;
  const partnerApi = await loadWithFetch(async (url, init) => {
    request = { url: String(url), init };
    return jsonResponse(201, {
      success: true,
      recovery: {
        oldReservationId, premiumReservationId: reservationId, status: 'issued', issuedTicketCount: 10,
        recoveredTicketCount: 2, recoveredMatchIndices: [1, 2], retainedUsedTicketCount: 0,
      },
      tickets: tickets(10),
    });
  });
  try { await withPartnerEnv(async () => {
    const recovered = await partnerApi.recoverMissingAhibiGeneralTickets({
      premiumReservationId: reservationId,
      oldReservationId,
      paymentId,
      expectedMatches: tickets(10).map(ticket => ticket.match),
    });
    assert.equal(recovered.length, 10);
    assert.equal(request.url, `http://localhost:5001/api/nusc-partner/v1/reservations/${reservationId}/recover-missing-general-tickets`);
    assert.equal(request.init.method, 'POST');
    assert.deepEqual(JSON.parse(request.init.body), { oldReservationId, paymentId });
    const timestamp = request.init.headers['x-ahibi-timestamp'];
    const requestId = request.init.headers['x-ahibi-request-id'];
    const bodyHash = createHash('sha256').update(request.init.body).digest('hex');
    const path = `/api/nusc-partner/v1/reservations/${reservationId}/recover-missing-general-tickets`;
    const message = `${timestamp}\n${requestId}\nPOST\n${path}\n${bodyHash}`;
    assert.equal(request.init.headers['x-ahibi-signature'], createHmac('sha256', secret).update(message).digest('hex'));
  }); } finally { partnerApi.restoreFetch(); }
});

test('missing Premium recovery rejects incomplete or inconsistent recovery responses', async () => {
  const fullTickets = tickets(10);
  const invalidResponses = [
    { recovery: { issuedTicketCount: 8, recoveredTicketCount: 2, recoveredMatchIndices: [1, 2], retainedUsedTicketCount: 0 }, tickets: fullTickets },
    { recovery: { issuedTicketCount: 10, recoveredTicketCount: 2, recoveredMatchIndices: [1, 3], retainedUsedTicketCount: 0 }, tickets: fullTickets },
    { recovery: { issuedTicketCount: 10, recoveredTicketCount: 2, recoveredMatchIndices: [1, 2], retainedUsedTicketCount: 0 }, tickets: tickets(9) },
    { recovery: { issuedTicketCount: 10, recoveredTicketCount: 2, recoveredMatchIndices: [1, 2], retainedUsedTicketCount: 0 }, tickets: fullTickets.map((ticket, i) => i === 0 ? { ...ticket, match: { ...ticket.match, opponent: 'Wrong opponent' } } : ticket) },
  ];
  for (const invalid of invalidResponses) {
    const partnerApi = await loadWithFetch(async () => jsonResponse(200, {
      success: true,
      recovery: {
        oldReservationId, premiumReservationId: reservationId, status: 'issued',
        ...invalid.recovery,
      },
      tickets: invalid.tickets,
    }));
    try { await withPartnerEnv(async () => assert.rejects(
      () => partnerApi.recoverMissingAhibiGeneralTickets({
        premiumReservationId: reservationId,
        oldReservationId,
        paymentId,
        expectedMatches: fullTickets.map(ticket => ticket.match),
      }),
      error => error.code === 'AHIBI_RESPONSE_INVALID' || error.code === 'AHIBI_RESPONSE_MISMATCH',
    )); } finally { partnerApi.restoreFetch(); }
  }
});

test('missing Premium recovery preserves AHIBI check-in conflicts for staff review', async () => {
  const partnerApi = await loadWithFetch(async () => jsonResponse(409, {
    success: false,
    code: 'TARGET_MATCH_ALREADY_CHECKED_IN',
  }));
  try { await withPartnerEnv(async () => assert.rejects(
    () => partnerApi.recoverMissingAhibiGeneralTickets({
      premiumReservationId: reservationId,
      oldReservationId,
      paymentId,
      expectedMatches: tickets(10).map(ticket => ticket.match),
    }),
    error => error.status === 409 && error.code === 'TARGET_MATCH_ALREADY_CHECKED_IN',
  )); } finally { partnerApi.restoreFetch(); }
});

test('replacement rejects duplicate, unexpected, wrong-type, and cancelled ticket records', async () => {
  for (const malformed of [
    [tickets(1)[0], tickets(1)[0]],
    [{ ...tickets(1)[0], match: { ...tickets(1)[0].match, eventId: 'unexpected-event' } }],
    [{ ...tickets(1)[0], ticketType: 'General Pass' }],
    [{ ...tickets(1)[0], status: 'cancelled' }],
  ]) {
    const module = await loadWithFetch(async () => jsonResponse(201, {
      success: true, retainedUsedTicketCount: 10 - malformed.length, tickets: malformed,
    }));
    try { await withPartnerEnv(async () => assert.rejects(
      () => module.replaceAhibiGeneralPass({ premiumReservationId: reservationId, oldReservationId, paymentId, partnerOrderId, expectedEventIds: eventIds }),
      error => error.code === 'AHIBI_RESPONSE_INVALID' || error.code === 'AHIBI_RESPONSE_MISMATCH',
    )); } finally { module.restoreFetch(); }
  }
});

test('Premium reservation status accepts partial tickets only with a replacement summary; General replaced status is empty', async () => {
  const module = await loadWithFetch(async url => {
    const isOld = String(url).endsWith(oldReservationId);
    return jsonResponse(200, {
      success: true,
      reservation: {
        reservationId: isOld ? oldReservationId : reservationId,
        partnerOrderId: isOld ? 'nusc-order-22222222-2222-4222-8222-222222222222' : partnerOrderId,
        passId: isOld ? 'general-season' : 'premium-season', status: isOld ? 'replaced' : 'issued',
        expiresAt: '2026-10-27T12:00:00.000Z', zone: isOld ? 'G-1' : null,
      },
      replacement: isOld ? undefined : { retainedUsedTicketCount: 1, cancelledGeneralTicketCount: 9 },
      tickets: isOld ? [] : tickets(9),
    });
  });
  try { await withPartnerEnv(async () => {
    const premium = await module.getAhibiSeasonPassStatus(reservationId, { partnerOrderId, passId: 'premium-season', zone: null });
    assert.equal(premium.reservation.status, 'issued');
    assert.equal(premium.tickets.length, 9);
    const old = await module.getAhibiSeasonPassStatus(oldReservationId, {
      partnerOrderId: 'nusc-order-22222222-2222-4222-8222-222222222222', passId: 'general-season', zone: 'G-1',
    });
    assert.equal(old.reservation.status, 'replaced');
    assert.deepEqual(old.tickets, []);
  }); } finally { module.restoreFetch(); }
});

test('expired Premium reservation status accepts an empty ticket list without a replacement summary', async () => {
  const module = await loadWithFetch(async () => jsonResponse(200, {
    success: true,
    reservation: {
      reservationId,
      partnerOrderId,
      passId: 'premium-season',
      status: 'expired',
      expiresAt: '2026-10-27T12:00:00.000Z',
      zone: null,
    },
    tickets: [],
  }));
  try { await withPartnerEnv(async () => {
    const status = await module.getAhibiSeasonPassStatus(reservationId, {
      partnerOrderId, passId: 'premium-season', zone: null,
    });
    assert.equal(status.reservation.status, 'expired');
    assert.deepEqual(status.tickets, []);
  }); } finally { module.restoreFetch(); }
});

test('normal confirm still requires all ten tickets', async () => {
  const module = await loadWithFetch(async () => jsonResponse(200, {
    success: true,
    issuance: { reservationId, partnerOrderId, paymentId, status: 'issued' },
    tickets: tickets(9),
  }));
  try { await withPartnerEnv(async () => assert.rejects(
    () => module.confirmAhibiSeasonPass(reservationId, paymentId, { partnerOrderId, passId: 'premium-season', zone: null }),
    error => error.code === 'AHIBI_RESPONSE_INVALID',
  )); } finally { module.restoreFetch(); }
});
