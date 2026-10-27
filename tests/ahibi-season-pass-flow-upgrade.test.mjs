import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const memberId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';
const oldOrderId = '44444444-4444-4444-8444-444444444444';
const newOrderId = '55555555-5555-4555-8555-555555555555';
const oldReservationId = `nsp_${'b'.repeat(40)}`;
const premiumReservationId = `nsp_${'a'.repeat(40)}`;
const paymentId = 'pay_smokeupgrade';
const oldPartnerOrderId = `nusc-order-${oldOrderId}`;
const newPartnerOrderId = `nusc-order-${newOrderId}`;
const eventIds = Array.from({ length: 10 }, (_, i) => `event-${i + 1}`);
const secret = 'test-partner-secret-with-at-least-thirty-two-bytes';
const oldOrder = {
  id: oldOrderId, member_id: memberId, user_id: userId, plan_id: 'general-plan', purpose: 'tier', status: 'paid',
  payment_id: 'pay_oldgeneral', ahibi_reservation_id: oldReservationId, ahibi_pass_id: 'general-season', ahibi_zone: 'G-1',
  ahibi_pass_status: 'issued',
};
const newOrder = {
  id: newOrderId, member_id: memberId, user_id: userId, plan_id: 'premium-plan', purpose: 'tier', status: 'paid',
  razorpay_order_id: 'order_upgrade', payment_id: paymentId, upgrade_from_plan_id: 'general-plan',
  upgrade_credit_source_order_id: oldOrderId, ahibi_replaces_order_id: oldOrderId,
  ahibi_reservation_id: premiumReservationId, ahibi_pass_id: 'premium-season', ahibi_zone: null,
  ahibi_pass_status: 'held', ahibi_reservation_expires_at: '2026-10-27T12:00:00.000Z',
};
const oldTickets = eventIds.map((eventId, i) => ({
  payment_order_id: oldOrderId, member_id: memberId, user_id: userId,
  ahibi_booking_id: `old-booking-${i + 1}`, ahibi_event_id: eventId,
  match_date: `2027-01-${String(i + 1).padStart(2, '0')}`, opponent: `Opponent ${i + 1}`,
  ticket_type: 'General Pass', zone: 'G-1', status: i === 0 ? 'confirmed' : 'confirmed',
  ticket_access_path: `/api/nusc-partner/v1/reservations/${oldReservationId}/tickets/old-booking-${i + 1}`,
}));
const remoteOldTickets = oldTickets.map((ticket, i) => ({
  match: { matchIndex: i + 1, eventId: ticket.ahibi_event_id, matchDate: ticket.match_date, opponent: ticket.opponent },
  ticketId: ticket.ahibi_booking_id, status: i === 0 ? 'used' : 'confirmed', ticketType: 'General Pass', zone: 'G-1',
  ticketAccessPath: ticket.ticket_access_path,
}));
const premiumTickets = eventIds.slice(1).map((eventId, i) => ({
  match: { matchIndex: i + 2, eventId, matchDate: `2027-01-${String(i + 2).padStart(2, '0')}`, opponent: `Opponent ${i + 2}` },
  ticketId: `premium-booking-${i + 1}`, status: 'confirmed', ticketType: 'Premium Pass', zone: null,
  ticketAccessPath: `/api/nusc-partner/v1/reservations/${premiumReservationId}/tickets/premium-booking-${i + 1}`,
}));

function makeDatabase() {
  const calls = [];
  const tickets = [...oldTickets];
  let oldReplacedBy = null;
  let newPassStatus = 'held';
  let oldPassStatus = 'issued';
  function from(table) {
    const q = { table, action: 'select', filters: {}, values: null, columns: '*' };
    const chain = {
      select(columns) { q.columns = columns; return chain; },
      update(values) { q.action = 'update'; q.values = values; calls.push(['update', table, values]); return chain; },
      upsert(rows) { q.action = 'upsert'; q.values = rows; calls.push(['upsert', table, rows.length]); return chain; },
      eq(key, value) { (q.filters[key] ??= []).push(value); return chain; },
      in(key, values) { (q.filters[key] ??= []).push(values); return chain; },
      neq(key, value) { q.filters[`not:${key}`] = value; return chain; },
      order() { return chain; }, limit() { return chain; },
      maybeSingle() { return Promise.resolve(execute(q, true)); },
      single() { return Promise.resolve(execute(q, true)); },
      then(resolve, reject) { return Promise.resolve(execute(q, false)).then(resolve, reject); },
    };
    return chain;
  }
  function execute(q, single) {
    const first = key => q.filters[key]?.[0];
    if (q.action === 'select' && q.table === 'membership_payment_orders') {
      if (first('razorpay_order_id')) return { data: newOrder, error: null };
      if (first('id') === oldOrderId || first('upgrade_credit_source_order_id') === oldOrderId) {
        return { data: { ...oldOrder, ahibi_pass_status: oldPassStatus }, error: null };
      }
      return { data: newOrder, error: null };
    }
    if (q.action === 'select' && q.table === 'membership_plans') return { data: { slug: 'rise-premium' }, error: null };
    if (q.action === 'select' && q.table === 'membership_season_pass_tickets') {
      const order = first('payment_order_id');
      const found = tickets.filter(ticket => ticket.payment_order_id === order).map(ticket => {
        if (q.columns === 'ahibi_event_id') return { ahibi_event_id: ticket.ahibi_event_id };
        if (q.columns === 'ahibi_event_id,ahibi_booking_id') return { ahibi_event_id: ticket.ahibi_event_id, ahibi_booking_id: ticket.ahibi_booking_id };
        return ticket;
      });
      return single ? { data: found[0] ?? null, error: null } : { data: found, error: null };
    }
    if (q.action === 'upsert' && q.table === 'membership_season_pass_tickets') {
      for (const row of q.values) {
        const existing = tickets.find(ticket => ticket.payment_order_id === row.payment_order_id && ticket.ahibi_event_id === row.ahibi_event_id);
        if (existing) Object.assign(existing, row); else tickets.push({ id: `nusc-${row.ahibi_event_id}`, ...row });
      }
      return { data: null, error: null };
    }
    if (q.action === 'update' && q.table === 'membership_season_pass_tickets') {
      const order = first('payment_order_id');
      const ids = q.filters.ahibi_event_id?.find(Array.isArray);
      for (const ticket of tickets) {
        if (ticket.payment_order_id === order && (!ids || ids.includes(ticket.ahibi_event_id))
            && (!q.filters.status || q.filters.status.includes(ticket.status))) Object.assign(ticket, q.values);
      }
      return { data: null, error: null };
    }
    if (q.action === 'update' && q.table === 'membership_payment_orders') {
      if (q.values.ahibi_pass_status === 'replaced') {
        oldPassStatus = 'replaced'; oldReplacedBy = q.values.ahibi_replaced_by_order_id;
        return { data: { id: oldOrderId }, error: null };
      }
      if (q.values.ahibi_pass_status === 'issued') newPassStatus = 'issued';
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }
  return { client: { from }, calls, tickets, state: () => ({ oldPassStatus, oldReplacedBy, newPassStatus }) };
}

async function loadModules(fetchImpl, database) {
  const apiSource = await readFile(new URL('../packages/membership/src/ahibi-season-pass.ts', import.meta.url), 'utf8');
  const apiOutput = ts.transpileModule(apiSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const apiLoaded = { exports: {} };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  new Function('require', 'module', 'exports', apiOutput)(require, apiLoaded, apiLoaded.exports);
  const flowSource = await readFile(new URL('../packages/membership/src/ahibi-season-pass-flow.ts', import.meta.url), 'utf8');
  const flowOutput = ts.transpileModule(flowSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const flowLoaded = { exports: {} };
  new Function('require', 'module', 'exports', flowOutput)((name) => {
    if (name === '@nusc/db') return { createAdminClient: () => database.client };
    if (name === './ahibi-season-pass') return apiLoaded.exports;
    return require(name);
  }, flowLoaded, flowLoaded.exports);
  return { flow: flowLoaded.exports, restoreFetch: () => { globalThis.fetch = originalFetch; } };
}

test('paid General-to-Premium fulfillment uses replace-general, stores nine Premium tickets, and preserves used General history', async () => {
  const database = makeDatabase();
  const partnerCalls = [];
  let replaced = false;
  const { flow, restoreFetch } = await loadModules(async (url, init) => {
    const path = new URL(url).pathname;
    partnerCalls.push([init.method, path]);
    if (path.endsWith(oldReservationId)) {
      if (replaced) return Response.json({ success: true, reservation: {
        reservationId: oldReservationId, partnerOrderId: oldPartnerOrderId, passId: 'general-season',
        status: 'replaced', expiresAt: '2026-10-27T12:00:00.000Z', zone: 'G-1',
      }, tickets: [] });
      return Response.json({ success: true, reservation: {
        reservationId: oldReservationId, partnerOrderId: oldPartnerOrderId, passId: 'general-season',
        status: 'issued', expiresAt: '2026-10-27T12:00:00.000Z', zone: 'G-1',
      }, tickets: remoteOldTickets });
    }
    if (path.endsWith('/replace-general')) {
      replaced = true;
      assert.deepEqual(JSON.parse(init.body), { oldReservationId, paymentId });
      return Response.json({ success: true, retainedUsedTicketCount: 1, cancelledGeneralTicketCount: 9, tickets: premiumTickets }, { status: 201 });
    }
    throw new Error(`Unexpected AHIBI request: ${path}`);
  }, database);
  const keys = ['NUSC_AHIBI_SEASON_PASS_ENABLED', 'NUSC_AHIBI_PARTNER_MODE', 'AHIBI_PARTNER_TEST_BASE_URL',
    'NUSC_PARTNER_TEST_KEY_ID', 'NUSC_PARTNER_TEST_SECRET', 'NODE_ENV', 'VERCEL_ENV'];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    NUSC_AHIBI_SEASON_PASS_ENABLED: 'true', NUSC_AHIBI_PARTNER_MODE: 'test',
    AHIBI_PARTNER_TEST_BASE_URL: 'http://localhost:5001', NUSC_PARTNER_TEST_KEY_ID: 'nusc-test',
    NUSC_PARTNER_TEST_SECRET: secret, NODE_ENV: 'development',
  });
  delete process.env.VERCEL_ENV;
  try {
    assert.equal(await flow.ensureAhibiPassIssued('order_upgrade', paymentId), 'issued');
    assert.ok(partnerCalls.some(([method, path]) => method === 'POST' && path.endsWith('/replace-general')));
    assert.equal(partnerCalls.some(([, path]) => path.endsWith('/confirm')), false);
    assert.equal(database.tickets.filter(ticket => ticket.payment_order_id === newOrderId).length, 9);
    assert.equal(database.tickets.find(ticket => ticket.payment_order_id === oldOrderId && ticket.ahibi_event_id === eventIds[0]).status, 'used');
    assert.equal(database.tickets.filter(ticket => ticket.payment_order_id === oldOrderId && ticket.status === 'cancelled').length, 9);
    assert.deepEqual(database.state(), { oldPassStatus: 'replaced', oldReplacedBy: newOrderId, newPassStatus: 'issued' });
  } finally {
    restoreFetch();
    for (const key of keys) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key];
  }
});
