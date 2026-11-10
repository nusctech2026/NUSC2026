import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  confirmAhibiSeasonPass,
} from '../packages/membership/src/ahibi-season-pass.ts';
import {
  getRiseSeasonPassPrices,
  manualSeasonPassRecoveryPartnerOrderId,
  saveManualSeasonPassTickets,
  isEligibleRiseSeasonPassMember,
  searchRiseSeasonPassMembers,
} from '../packages/membership/src/ahibi-manual-season-pass.ts';
import { handleManualRisePassRequest } from '../apps/web/src/app/api/integrations/ahibi/manual-season-passes/handler.ts';

test('RISE manual pass prices are server-owned and match the approved totals', async () => {
  const prices = getRiseSeasonPassPrices();
  assert.equal(prices['general-season'].amountMinor, 389400);
  assert.equal(prices['premium-season'].amountMinor, 1947000);
  assert.deepEqual(await searchRiseSeasonPassMembers(''), { members: [], passes: prices });
});

test('RISE manual pass selection requires a current, paid Rise General or Rise Premium member', () => {
  const active = {
    status: 'active',
    registration_payment_status: 'paid',
    end_date: new Date(Date.now() + 60_000).toISOString(),
    plan: { slug: 'rise-general' },
  };
  assert.equal(isEligibleRiseSeasonPassMember(active), true);
  assert.equal(isEligibleRiseSeasonPassMember({ ...active, registration_payment_status: 'pending' }), false);
  assert.equal(isEligibleRiseSeasonPassMember({ ...active, end_date: new Date(Date.now() - 60_000).toISOString() }), false);
  assert.equal(isEligibleRiseSeasonPassMember({ ...active, plan: { slug: 'registration' } }), false);
});

test('NUSC integration endpoint rejects an unsigned manual pass request', async () => {
  const response = await handleManualRisePassRequest(new Request('https://nusc.example/api/integrations/ahibi/manual-season-passes/members/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '' }),
  }), 'search');
  assert.equal(response.status, 401);
});

test('existing Ahibi confirmation client accepts a stable manual settlement reference without creating a Razorpay payment', async (t) => {
  const names = [
    'NUSC_AHIBI_SEASON_PASS_ENABLED', 'NUSC_AHIBI_PARTNER_MODE', 'AHIBI_PARTNER_TEST_BASE_URL',
    'NUSC_PARTNER_TEST_KEY_ID', 'NUSC_PARTNER_TEST_SECRET', 'NODE_ENV', 'VERCEL_ENV',
  ];
  const oldEnv = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  const reservationId = 'nsp_' + 'a'.repeat(40);
  const manualSettlementId = 'manual_123e4567-e89b-42d3-a456-426614174000';
  const partnerOrderId = 'nusc-order-123e4567-e89b-42d3-a456-426614174000';
  let sentBody;
  process.env.NUSC_AHIBI_SEASON_PASS_ENABLED = 'true';
  process.env.NUSC_AHIBI_PARTNER_MODE = 'test';
  process.env.AHIBI_PARTNER_TEST_BASE_URL = 'https://ahibi-test.example';
  process.env.NUSC_PARTNER_TEST_KEY_ID = 'nusc-test-key';
  process.env.NUSC_PARTNER_TEST_SECRET = 'test-secret-for-local-unit-test-32';
  process.env.NODE_ENV = 'test';
  delete process.env.VERCEL_ENV;
  globalThis.fetch = async (_url, init) => {
    sentBody = JSON.parse(init.body);
    const tickets = Array.from({ length: 10 }, (_, index) => ({
      ticketId: `ticket-${index + 1}`,
      status: 'confirmed',
      ticketType: 'General Pass',
      zone: 'G-1',
      match: { eventId: `event-${index + 1}`, matchDate: `2026-11-${String(index + 14).padStart(2, '0')}`, opponent: `Opponent ${index + 1}` },
      ticketAccessPath: `/api/nusc-partner/v1/reservations/${reservationId}/tickets/ticket-${index + 1}`,
    }));
    return new Response(JSON.stringify({
      success: true,
      issuance: { reservationId, partnerOrderId, paymentId: manualSettlementId, status: 'issued' },
      tickets,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  const result = await confirmAhibiSeasonPass(reservationId, manualSettlementId, {
    partnerOrderId,
    passId: 'general-season',
    zone: 'G-1',
  });
  assert.equal(result.tickets.length, 10);
  assert.deepEqual(sentBody, { paymentId: manualSettlementId });
  assert.equal(Object.hasOwn(sentBody, 'razorpayPaymentId'), false);
});

test('expired RISE inventory recovery uses a deterministic AHIBI partner-order UUID', async () => {
  const first = manualSeasonPassRecoveryPartnerOrderId('123e4567-e89b-42d3-a456-426614174000', 'nsp_' + 'a'.repeat(40));
  const retry = manualSeasonPassRecoveryPartnerOrderId('123e4567-e89b-42d3-a456-426614174000', 'nsp_' + 'a'.repeat(40));
  assert.equal(first, retry);
  assert.match(first, /^nusc-order-[a-f0-9-]{36}$/);
  assert.notEqual(first, manualSeasonPassRecoveryPartnerOrderId('123e4567-e89b-42d3-a456-426614174000', 'nsp_' + 'b'.repeat(40)));
});

test('RISE issuance stores ten member-owned ticket rows without a payment order', async () => {
  const storedRows = [];
  let insertCount = 0;
  const db = {
    from(table) {
      assert.equal(table, 'membership_season_pass_tickets');
      const query = {
        insert: async (rows) => {
          insertCount += 1;
          storedRows.push(...rows);
          return { error: null };
        },
        select() { return this; },
        eq() { return this; },
        then(resolve, reject) { return Promise.resolve({ data: storedRows, error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const order = { id: 'manual-order', member_id: 'member-id', user_id: 'user-id' };
  const tickets = Array.from({ length: 10 }, (_, index) => ({
    eventId: 'event-' + (index + 1),
    matchDate: '2026-11-' + String(index + 1).padStart(2, '0'),
    opponent: 'Opponent ' + (index + 1),
    ticketId: 'booking-' + (index + 1),
    status: 'confirmed',
    ticketType: 'General Pass',
    zone: 'G-1',
    ticketAccessPath: '/tickets/' + (index + 1),
  }));
  await saveManualSeasonPassTickets(db, order, tickets);
  assert.equal(storedRows.length, 10);
  assert.equal(insertCount, 1);
  assert.ok(storedRows.every(row => row.payment_order_id === null && row.manual_order_id === order.id));
  assert.equal(new Set(storedRows.map(row => row.ahibi_event_id)).size, 10);
});

test('RISE ticket persistence recovers a concurrent unique-index insert without duplicating rows', async () => {
  const storedRows = [];
  let insertCount = 0;
  const db = {
    from(table) {
      assert.equal(table, 'membership_season_pass_tickets');
      const query = {
        insert: async (rows) => {
          insertCount += 1;
          storedRows.push(...rows);
          return { error: { code: '23505' } };
        },
        select() { return this; },
        eq() { return this; },
        then(resolve, reject) { return Promise.resolve({ data: storedRows, error: null }).then(resolve, reject); },
      };
      return query;
    },
  };
  const order = { id: 'manual-order', member_id: 'member-id', user_id: 'user-id' };
  const tickets = Array.from({ length: 10 }, (_, index) => ({
    eventId: 'event-' + (index + 1),
    matchDate: '2026-11-' + String(index + 1).padStart(2, '0'),
    opponent: 'Opponent ' + (index + 1),
    ticketId: 'booking-' + (index + 1),
    status: 'confirmed',
    ticketType: 'General Pass',
    zone: 'G-1',
    ticketAccessPath: '/tickets/' + (index + 1),
  }));
  await saveManualSeasonPassTickets(db, order, tickets);
  assert.equal(insertCount, 1);
  assert.equal(storedRows.length, 10);
});
