import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const memberId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const orderId = '33333333-3333-4333-8333-333333333333';
const reservationId = `nsp_${'a'.repeat(40)}`;

function makeTickets() {
  return Array.from({ length: 10 }, (_, offset) => {
    const ticketId = (offset + 1).toString(16).padStart(24, '0');
    const eventId = (offset + 101).toString(16).padStart(24, '0');
    return {
      matchIndex: offset + 1,
      ticketId,
      eventId,
      matchDate: `2027-01-${String(offset + 1).padStart(2, '0')}`,
      opponent: `Opponent ${offset + 1}`,
      ticketType: 'Premium Pass',
      zone: null,
      status: 'confirmed',
      ticketAccessPath: `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${ticketId}`,
    };
  });
}

function mockDatabase({ cancelled = false, kind = 'paid' } = {}) {
  const tickets = makeTickets();
  const ticketRows = tickets.map((ticket, index) => ({
    ...(kind === 'paid' ? { payment_order_id: orderId } : { manual_order_id: orderId }),
    member_id: memberId,
    user_id: userId,
    ahibi_booking_id: index === 4 ? 'aaaaaaaaaaaaaaaaaaaaaaaa' : ticket.ticketId,
    ahibi_event_id: ticket.eventId,
    match_date: ticket.matchDate,
    opponent: ticket.opponent,
    ticket_type: ticket.ticketType,
    zone: ticket.zone,
    status: cancelled && index === 4 ? 'cancelled' : index === 0 ? 'used' : 'confirmed',
    ticket_access_path: `/api/nusc-partner/v1/reservations/${reservationId}/tickets/${index === 4 ? 'aaaaaaaaaaaaaaaaaaaaaaaa' : ticket.ticketId}`,
  }));
  const calls = [];
  const order = { id: orderId, member_id: memberId, user_id: userId, purpose: 'tier', status: 'paid', ahibi_reservation_id: reservationId, ahibi_pass_id: 'premium-season', ahibi_zone: null, ahibi_pass_status: 'issued' };
  const manualOrder = { id: orderId, member_id: memberId, user_id: userId, status: 'needs_reconciliation', pass_id: 'premium-season', ticket_type: 'Premium Pass', zone: null, settlement_type: 'complimentary', settlement_hash: 'settled-manually', ahibi_pass_status: 'needs_reconciliation', ahibi_reservation_id: reservationId };
  const member = { id: memberId, user_id: userId, membership_number: 'NUSC12345678' };

  function from(table) {
    const query = { table, action: 'select', filters: {}, values: null };
    const chain = {
      select() { return chain; },
      update(values) { query.action = 'update'; query.values = values; calls.push(['update', table, values]); return chain; },
      upsert(values, options) { query.action = 'upsert'; query.values = values; query.options = options; calls.push(['upsert', table, values, options]); return chain; },
      eq(key, value) { (query.filters[key] ||= []).push(value); return chain; },
      in(key, value) { (query.filters[key] ||= []).push(value); return chain; },
      not(key, operator, value) { query.filters[`not:${key}`] = [operator, value]; return chain; },
      order() { return chain; },
      limit() { return chain; },
      maybeSingle() { return Promise.resolve(run(query, true)); },
      single() { return Promise.resolve(run(query, true)); },
      then(resolve, reject) { return Promise.resolve(run(query, false)).then(resolve, reject); },
    };
    return chain;
  }

  function matches(row, filters) {
    return Object.entries(filters).every(([key, values]) => {
      if (key.startsWith('not:')) return true;
      return values.some(value => Array.isArray(value) ? value.includes(row[key]) : row[key] === value);
    });
  }

  function run(query, single) {
    const { table, action, values, filters } = query;
    if (table === 'members' && action === 'select') {
      const rows = [member].filter(row => matches(row, filters));
      return { data: single ? rows[0] || null : rows, error: null };
    }
    if (table === 'membership_payment_orders') {
      if (action === 'select') {
        const rows = [order].filter(row => matches(row, filters));
        return { data: single ? rows[0] || null : rows, error: null };
      }
      if (action === 'update') {
        Object.assign(order, values);
        return { data: null, error: null };
      }
    }
    if (table === 'membership_ahibi_manual_pass_orders') {
      if (action === 'select') {
        const rows = [manualOrder].filter(row => matches(row, filters));
        return { data: single ? rows[0] || null : rows, error: null };
      }
      if (action === 'update') {
        Object.assign(manualOrder, values);
        return { data: null, error: null };
      }
    }
    if (table === 'membership_season_pass_tickets') {
      if (action === 'select') {
        const rows = ticketRows.filter(row => matches(row, filters));
        return { data: single ? rows[0] || null : rows, error: null };
      }
      if (action === 'upsert') {
        for (const row of values) {
          const key = kind === 'paid' ? 'payment_order_id' : 'manual_order_id';
          const existing = ticketRows.find(item => item[key] === row[key] && item.ahibi_event_id === row.ahibi_event_id);
          if (existing) Object.assign(existing, row, { status: existing.status === 'used' ? 'used' : row.status });
          else ticketRows.push({ ...row });
        }
        return { data: null, error: null };
      }
    }
    throw new Error(`Unexpected database query: ${action} ${table}`);
  }

  return { client: { from }, calls, order, manualOrder, ticketRows };
}

function mockSearchDatabase() {
  const member = {
    id: memberId,
    user_id: userId,
    membership_number: 'NUSC12345678',
    plan: [{ slug: 'rise-premium', name: 'RISE Premium' }],
  };
  const order = {
    id: orderId,
    member_id: memberId,
    user_id: userId,
    purpose: 'tier',
    status: 'paid',
    payment_id: 'pay_sanitized',
    paid_at: '2026-10-31T12:00:00.000Z',
    ahibi_reservation_id: reservationId,
    ahibi_pass_id: 'premium-season',
    ahibi_zone: null,
    ahibi_pass_status: 'issued',
  };
  const ticketRows = makeTickets().map((ticket) => ({
    payment_order_id: orderId,
    member_id: memberId,
    user_id: userId,
    ahibi_booking_id: ticket.ticketId,
    ahibi_event_id: ticket.eventId,
    match_date: ticket.matchDate,
    opponent: ticket.opponent,
    ticket_type: ticket.ticketType,
    zone: null,
    status: 'confirmed',
    ticket_access_path: ticket.ticketAccessPath,
  }));

  function from(table) {
    const query = { table };
    const chain = {
      select() { return chain; },
      eq() { return chain; },
      ilike() { return chain; },
      not() { return chain; },
      in() { return chain; },
      order() { return chain; },
      limit() { return chain; },
      maybeSingle() { return Promise.resolve(run(query, true)); },
      then(resolve, reject) { return Promise.resolve(run(query, false)).then(resolve, reject); },
    };
    return chain;
  }
  function run(query, single) {
    if (query.table === 'members') return { data: single ? member : [member], error: null };
    if (query.table === 'membership_payment_orders') return { data: single ? order : [order], error: null };
    if (query.table === 'membership_ahibi_manual_pass_orders') return { data: null, error: { code: '42P01', message: 'relation does not exist' } };
    if (query.table === 'membership_season_pass_tickets') return { data: ticketRows, error: null };
    if (query.table === 'member_profiles') return { data: { first_name: 'Test', last_name: 'Member', phone: '9876543210' }, error: null };
    throw new Error(`Unexpected search query: ${query.table}`);
  }
  return { client: { from } };
}

async function loadRecoveryService(mockDb) {
  const source = await readFile(new URL('../packages/membership/src/ahibi-season-pass-recovery.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const stubRequire = (specifier) => specifier === '@nusc/db' ? { createAdminClient: () => mockDb.client } : require(specifier);
  new Function('require', 'module', 'exports', outputText)(stubRequire, loaded, loaded.exports);
  return loaded.exports;
}

test('NUSC recovery sync repairs stale dashboard references and preserves checked-in state', async () => {
  const db = mockDatabase();
  const service = await loadRecoveryService(db);
  const result = await service.syncAhibiSeasonPassRecovery({
    orderId,
    memberNumber: 'NUSC12345678',
    kind: 'paid',
    reservationId,
    tickets: makeTickets(),
    adminReference: 'admin-test',
  });

  assert.deepEqual(result, { status: 'synced', ticketCount: 10, activeTicketCount: 9, usedTicketCount: 1 });
  assert.equal(db.ticketRows.length, 10);
  assert.equal(db.ticketRows.find(row => row.ahibi_event_id === makeTickets()[4].eventId).ahibi_booking_id, makeTickets()[4].ticketId);
  assert.equal(db.ticketRows[0].status, 'used');
  assert.equal(db.order.ahibi_pass_status, 'issued');
  assert.equal(db.calls.filter(call => call[0] === 'upsert').length, 1);
});

test('NUSC recovery sync refuses to reactivate a cancelled dashboard ticket', async () => {
  const db = mockDatabase({ cancelled: true });
  const service = await loadRecoveryService(db);
  await assert.rejects(
    service.syncAhibiSeasonPassRecovery({
      orderId,
      memberNumber: 'NUSC12345678',
      kind: 'paid',
      reservationId,
      tickets: makeTickets(),
      adminReference: 'admin-test',
    }),
    error => error.code === 'INVALID_STORED_TICKET_STATE',
  );
  assert.equal(db.calls.filter(call => call[0] === 'upsert').length, 0);
});

test('NUSC recovery sync restores complimentary manual RISE passes without altering settlement', async () => {
  const db = mockDatabase({ kind: 'manual' });
  const service = await loadRecoveryService(db);
  const result = await service.syncAhibiSeasonPassRecovery({
    orderId,
    memberNumber: 'NUSC12345678',
    kind: 'manual',
    reservationId,
    tickets: makeTickets(),
    adminReference: 'admin-test',
  });

  assert.equal(result.status, 'synced');
  assert.equal(result.ticketCount, 10);
  assert.equal(db.ticketRows.length, 10);
  assert.equal(db.manualOrder.settlement_type, 'complimentary');
  assert.equal(db.manualOrder.status, 'issued');
  assert.equal(db.manualOrder.ahibi_pass_status, 'issued');
  assert.equal(db.calls.some(call => call[0] === 'update' && call[1] === 'membership_payment_orders'), false);
});

test('NUSC recovery search returns only an eligible RISE member and their season pass order', async () => {
  const service = await loadRecoveryService(mockSearchDatabase());
  const result = await service.searchAhibiSeasonPassRecovery('NUSC12345678');
  assert.equal(result.members.length, 1);
  assert.equal(result.members[0].tier, 'RISE Premium');
  assert.equal(result.members[0].phoneMasked, '••••••3210');
  assert.equal(result.members[0].phone, undefined);
  assert.equal(result.members[0].orders.length, 1);
  assert.equal(result.members[0].orders[0].passId, 'premium-season');
  assert.equal(result.members[0].orders[0].tickets.length, 10);
  assert.equal(result.members[0].orders[0].user_id, undefined);
});

test('NUSC exposes the signed recovery search route expected by AHIBI', async () => {
  const source = await readFile(new URL('../apps/web/src/app/api/integrations/ahibi/season-pass-recovery/search/route.ts', import.meta.url), 'utf8');
  assert.match(source, /verifyAhibiRequest\(req,\s*'season_pass_recovery_search'\)/);
  assert.match(source, /searchAhibiSeasonPassRecovery\(payload\.query\)/);
  assert.match(source, /NextResponse\.json\(\{ success: true, data \}\)/);
});

test('NUSC exposes the signed recovery sync route and AHIBI request/response contract', async () => {
  const source = await readFile(new URL('../apps/web/src/app/api/integrations/ahibi/season-pass-recovery/sync/route.ts', import.meta.url), 'utf8');
  assert.match(source, /verifyAhibiRequest\(req,\s*'season_pass_recovery_sync'\)/);
  assert.match(source, /payload\.requestId !== req\.headers\.get\('x-ahibi-request-id'\)/);
  assert.match(source, /syncAhibiSeasonPassRecovery\(\{/);
  for (const field of ['orderId', 'memberNumber', 'kind', 'reservationId', 'tickets', 'adminReference']) {
    assert.match(source, new RegExp(`${field}: payload\\.${field}`));
  }
  assert.match(source, /NextResponse\.json\(\{ success: true, data \}\)/);
});
