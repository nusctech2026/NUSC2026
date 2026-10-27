import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
async function load(relativePath, mocks) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)((name) => name in mocks ? mocks[name] : require(name), loaded, loaded.exports);
  return loaded.exports;
}

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const generalPlanId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const premiumPlanId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const secret = 'synthetic-checkout-secret';
const validCallback = {
  razorpay_order_id: 'order_owned', razorpay_payment_id: 'pay_captured',
  razorpay_signature: createHmac('sha256', secret).update('order_owned|pay_captured').digest('hex'),
};
async function payments({ user = { id: userId }, order = { razorpay_order_id: 'order_owned' }, selectedPlan = { slug: 'rise-general', is_active: true, is_purchasable_online: true }, memberRecord = null, currentPlan = null, captured, dbError = null, planError = null, lookupError = null, fetchedPayments = [], gatewayError = null, reservedOrder = null, reservedOrders = null, externalOrder = null, creationError = null, bindError = null } = {}) {
  const calls = [];
  let lastReservedOrder = reservedOrder;
  let reservedOrderIndex = 0;
  const session = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table) => {
      calls.push(['table', table]);
      const chain = {
        select: () => chain,
        eq: (key, value) => { calls.push(['filter', key, value]); return chain; },
        in: (key, value) => { calls.push(['filterIn', key, value]); return chain; },
        single: async () => ({ data: order, error: lookupError }),
        maybeSingle: async () => ({ data: order, error: lookupError }),
      };
      return chain;
    },
  };
  class Gateway {
    orders = { create: async (data) => {
      calls.push(['createOrder', data]);
      if (creationError) throw creationError;
      return externalOrder ?? { id: 'order_created', amount: reservedOrder.amount, currency: 'INR' };
    }, fetchPayments: async (id) => {
      calls.push(['fetchPayments', id]);
      if (gatewayError) throw gatewayError;
      return { items: fetchedPayments };
    } };
    payments = { fetch: async (id) => {
      calls.push(['fetch', id]);
      return captured ?? { id, order_id: 'order_owned', amount: 1000, currency: 'INR', status: 'captured', captured: true };
    } };
  }
  class AhibiSeasonPassError extends Error {
    constructor(status, code) { super(code); this.status = status; this.code = code; }
  }
  const api = await load('packages/membership/src/payments.ts', {
    '@nusc/db': { createServerClient: async () => session, createAdminClient: () => ({ rpc: async (name, args) => {
      calls.push(['rpc', name, args]);
      const isBegin = name === 'begin_membership_payment' || name === 'begin_membership_smoke_test_payment'
        || name === 'begin_membership_smoke_test_upgrade_payment';
      if (isBegin) {
        lastReservedOrder = reservedOrders?.[reservedOrderIndex++] ?? reservedOrder;
        return { data: lastReservedOrder, error: dbError };
      }
      return { data: { status: name === 'cancel_membership_payment' ? 'cancelled' : 'paid' }, error: dbError };
    }, from: (table) => {
      if (table === 'membership_plans') {
        let planId;
        const chain = { select: () => chain, eq: (key, value) => { calls.push(['planFilter', key, value]); if (key === 'id') planId = value; return chain; }, maybeSingle: async () => ({ data: memberRecord && planId === memberRecord.plan_id ? currentPlan : selectedPlan, error: planError }) };
        return chain;
      }
      if (table === 'members') {
        const chain = { select: () => chain, eq: (key, value) => { calls.push(['memberFilter', key, value]); return chain; }, maybeSingle: async () => ({ data: memberRecord, error: dbError }) };
        return chain;
      }
      const chain = {
        update: data => { calls.push(['adminUpdate', table, data]); return chain; },
        eq: (key, value) => { calls.push(['adminFilter', key, value]); return chain; },
        select: () => chain,
        single: async () => { calls.push(['bindResult']); return { data: bindError ? null : { id: lastReservedOrder?.id }, error: bindError }; },
      };
      return chain;
    } }) },
    './ahibi-season-pass': { AhibiSeasonPassError },
    './ahibi-season-pass-flow': {
      ensureAhibiPassIssued: async (orderId, paymentId) => { calls.push(['ensureAhibiPassIssued', orderId, paymentId]); return 'issued'; },
      releaseAhibiPassForOrder: async (orderId) => { calls.push(['releaseAhibiPassForOrder', orderId]); },
      reserveAhibiPassForOrder: async (orderId, zone) => { calls.push(['reserveAhibiPassForOrder', orderId, zone]); },
    },
    razorpay: Gateway,
  });
  return { api, calls };
}

async function withEnvironment(values, run) {
  const previous = new Map(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  try { return await run(); }
  finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

const riseSmokeEnvironment = {
  NUSC_RISE_LIVE_SMOKE_TEST_ENABLED: 'true',
  NUSC_RISE_LIVE_SMOKE_TEST_USER_ID: userId,
  NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  RAZORPAY_KEY_ID: 'synthetic-key',
  RAZORPAY_KEY_SECRET: secret,
};

function smokeOrder(overrides = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    amount: 100,
    currency: 'INR',
    purpose: 'tier',
    is_smoke_test: true,
    newly_created: true,
    razorpay_order_id: null,
    ...overrides,
  };
}

test('checkout gateway fails closed without either secret or public key', async () => {
  const { api } = await payments();
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  try {
    delete process.env.RAZORPAY_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = secret;
    assert.throws(() => api.paymentGateway(), /unavailable/);
    process.env.RAZORPAY_KEY_ID = 'synthetic-key';
    delete process.env.RAZORPAY_KEY_SECRET;
    assert.throws(() => api.paymentGateway(), /unavailable/);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('HMAC rejects missing, malformed, truncated, and changed signatures', async () => {
  const { api } = await payments();
  const message = 'order_owned|pay_captured';
  for (const signature of [null, undefined, 0, {}, '', 'a'.repeat(63), 'z'.repeat(64), 'a'.repeat(65), '0'.repeat(64)]) {
    assert.equal(api.validPaymentSignature(message, signature, secret), false);
  }
  assert.equal(api.validPaymentSignature(message, validCallback.razorpay_signature, secret), true);
  assert.equal(api.validPaymentSignature('order_other|pay_captured', validCallback.razorpay_signature, secret), false);
});

test('checkout uses the authenticated account and database price, and saves the gateway binding before returning', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key'; process.env.RAZORPAY_KEY_SECRET = secret;
  const reservedOrder = { id: userId, amount: 389400, currency: 'INR', purpose: 'tier', is_smoke_test: false, newly_created: true, razorpay_order_id: null };
  try {
    const fixture = await payments({ reservedOrder, selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
    const checkout = await fixture.api.createMembershipCheckout(generalPlanId, 'G-1');
    assert.equal(checkout.amount, 389400);
    assert.equal(checkout.orderId, 'order_created');
    assert.equal(JSON.stringify(checkout).includes(secret), false);
    assert.deepEqual(fixture.calls.find(call => call[0] === 'rpc'), ['rpc', 'begin_membership_payment', { p_user_id: userId, p_plan_id: generalPlanId }]);
    assert.deepEqual(fixture.calls.find(call => call[0] === 'createOrder'), ['createOrder', { amount: 389400, currency: 'INR', receipt: userId, notes: { membership_payment_id: userId } }]);
    assert.deepEqual(fixture.calls.find(call => call[0] === 'adminUpdate'), ['adminUpdate', 'membership_payment_orders', { razorpay_order_id: 'order_created', status: 'pending' }]);
    assert.ok(fixture.calls.some(call => call[0] === 'adminFilter' && call[1] === 'status' && call[2] === 'creating'));
    assert.equal(fixture.calls.at(-1)[0], 'bindResult');
    const resumed = await payments({ reservedOrder: { ...reservedOrder, newly_created: false, razorpay_order_id: 'order_existing' }, selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
    assert.equal((await resumed.api.createMembershipCheckout(generalPlanId, 'G-1')).orderId, 'order_existing');
    assert.equal(resumed.calls.some(call => call[0] === 'createOrder' || call[0] === 'adminUpdate'), false);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('allowlisted authenticated user receives one database-stored ₹1 Rise order, preserving the General zone', async () => {
  const order = smokeOrder();
  const fixture = await payments({ reservedOrder: order, selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
  await withEnvironment(riseSmokeEnvironment, async () => {
    const checkout = await Reflect.apply(fixture.api.createMembershipCheckout, undefined,
      [generalPlanId, 'G-4', 1298000, otherUserId]);
    assert.equal(checkout.amount, 100);
    assert.equal(checkout.orderId, 'order_created');
    assert.deepEqual(fixture.calls.find(call => call[0] === 'rpc'), [
      'rpc', 'begin_membership_smoke_test_payment', { p_user_id: userId, p_plan_id: generalPlanId },
    ]);
    assert.deepEqual(fixture.calls.find(call => call[0] === 'createOrder')?.[1], {
      amount: 100, currency: 'INR', receipt: order.id, notes: { membership_payment_id: order.id },
    });
    assert.deepEqual(fixture.calls.find(call => call[0] === 'reserveAhibiPassForOrder'), ['reserveAhibiPassForOrder', order.id, 'G-4']);
    assert.equal(checkout.description, 'NUSC Rise live smoke test');
  });
});

test('smoke gate blocks other authenticated users and fails closed after expiry', async () => {
  const selectedPlan = { slug: 'rise-premium', is_active: true, is_purchasable_online: true };
  const other = await payments({ user: { id: otherUserId }, reservedOrder: smokeOrder(), selectedPlan });
  await withEnvironment(riseSmokeEnvironment, async () => {
    await assert.rejects(() => other.api.createMembershipCheckout(premiumPlanId), /temporarily unavailable/);
    assert.equal(other.calls.some(call => call[0] === 'rpc' || call[0] === 'createOrder'), false);
  });

  for (const expiresAt of ['2000-01-01T00:00:00Z', '2099-01-01T00:00:00Z', undefined]) {
    const invalid = await payments({ reservedOrder: smokeOrder(), selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
    await withEnvironment({ ...riseSmokeEnvironment, NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT: expiresAt }, async () => {
      await assert.rejects(() => invalid.api.createMembershipCheckout(generalPlanId, 'G-2'), /temporarily unavailable/);
      assert.equal(invalid.calls.some(call => call[0] === 'rpc' || call[0] === 'createOrder'), false);
    });
  }
});

test('the separately allowlisted smoke upgrade requests exactly the database-gated ₹2 order', async () => {
  const order = smokeOrder({ amount: 200, is_smoke_test: false, is_smoke_test_upgrade: true });
  const fixture = await payments({ reservedOrder: order,
    selectedPlan: { slug: 'rise-premium', is_active: true, is_purchasable_online: true } });
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key'; process.env.RAZORPAY_KEY_SECRET = secret;
  const env = {
    ...riseSmokeEnvironment,
    NUSC_RISE_LIVE_SMOKE_UPGRADE_ENABLED: 'true',
    NUSC_RISE_LIVE_SMOKE_UPGRADE_USER_ID: userId,
    NUSC_RISE_LIVE_SMOKE_UPGRADE_EXPIRES_AT: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  try {
    await withEnvironment(env, async () => {
      const checkout = await Reflect.apply(fixture.api.createMembershipCheckout, undefined,
        [premiumPlanId, null, { amount: 1 }]);
      assert.equal(checkout.amount, 200);
      assert.deepEqual(fixture.calls.find(call => call[0] === 'rpc'), [
        'rpc', 'begin_membership_smoke_test_upgrade_payment', { p_user_id: userId, p_plan_id: premiumPlanId },
      ]);
      assert.equal(fixture.calls.find(call => call[0] === 'createOrder')[1].amount, 200);
      assert.equal(JSON.stringify(fixture.calls.find(call => call[0] === 'rpc')).includes('amount'), false);
    });
  } finally {
    if (previous[0] === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previous[0];
    if (previous[1] === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previous[1];
  }
});

test('smoke upgrade gate rejects invalid expiry before creating an order', async () => {
  const fixture = await payments({ selectedPlan: { slug: 'rise-premium', is_active: true, is_purchasable_online: true } });
  await withEnvironment({
    NUSC_RISE_LIVE_SMOKE_TEST_ENABLED: 'false',
    NUSC_RISE_LIVE_SMOKE_UPGRADE_ENABLED: 'true',
    NUSC_RISE_LIVE_SMOKE_UPGRADE_USER_ID: userId,
    NUSC_RISE_LIVE_SMOKE_UPGRADE_EXPIRES_AT: '2000-01-01T00:00:00Z',
  }, async () => {
    await assert.rejects(() => fixture.api.createMembershipCheckout(premiumPlanId), /smoke upgrade checkout is unavailable/i);
    assert.equal(fixture.calls.some(call => call[0] === 'rpc' || call[0] === 'createOrder'), false);
  });
});

test('an active General member can start the database-priced Premium upgrade and reserves ticket replacement', async () => {
  const order = smokeOrder({
    amount: 908600, is_smoke_test: false, newly_created: true,
    upgrade_from_plan_id: generalPlanId, upgrade_credit_source_order_id: 'general-paid-order',
    upgrade_credit_amount: 389400,
  });
  const fixture = await payments({
    reservedOrder: order,
    selectedPlan: { slug: 'rise-premium', is_active: true, is_purchasable_online: true },
    memberRecord: { plan_id: generalPlanId, status: 'active', end_date: new Date(Date.now() + 86400000).toISOString() },
    currentPlan: { slug: 'rise-general' },
  });
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key'; process.env.RAZORPAY_KEY_SECRET = secret;
  try {
    await withEnvironment({ NUSC_RISE_LIVE_SMOKE_TEST_ENABLED: 'false', NUSC_RISE_LIVE_SMOKE_UPGRADE_ENABLED: 'false' }, async () => {
      const checkout = await fixture.api.createMembershipCheckout(premiumPlanId);
      assert.equal(checkout.amount, 908600);
      assert.deepEqual(fixture.calls.find(call => call[0] === 'rpc'), [
        'rpc', 'begin_membership_payment', { p_user_id: userId, p_plan_id: premiumPlanId },
      ]);
      assert.equal(fixture.calls.find(call => call[0] === 'createOrder')[1].amount, 908600);
      assert.ok(fixture.calls.some(call => call[0] === 'reserveAhibiPassForOrder' && call[1] === order.id));
    });
  } finally {
    if (previous[0] === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previous[0];
    if (previous[1] === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previous[1];
  }
});

test('gate-off checkout uses the unchanged database plan price', async () => {
  const order = { ...smokeOrder({ amount: 389400, is_smoke_test: false }), newly_created: true };
  const fixture = await payments({ reservedOrder: order, selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
  await withEnvironment({ ...riseSmokeEnvironment,
    NUSC_RISE_LIVE_SMOKE_TEST_ENABLED: undefined,
    NUSC_RISE_LIVE_SMOKE_TEST_USER_ID: undefined,
    NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT: undefined,
  }, async () => {
    const checkout = await fixture.api.createMembershipCheckout(generalPlanId, 'G-1');
    assert.equal(checkout.amount, 389400);
    assert.deepEqual(fixture.calls.find(call => call[0] === 'rpc'), [
      'rpc', 'begin_membership_payment', { p_user_id: userId, p_plan_id: generalPlanId },
    ]);
    assert.equal(fixture.calls.find(call => call[0] === 'createOrder')[1].amount, 389400);
  });
});

test('smoke checkout retries reuse the existing Razorpay order and never create another charge order', async () => {
  const firstOrder = smokeOrder();
  const boundOrder = smokeOrder({ newly_created: false, razorpay_order_id: 'order_created' });
  const fixture = await payments({ reservedOrder: firstOrder, reservedOrders: [firstOrder, boundOrder],
    selectedPlan: { slug: 'rise-general', is_active: true, is_purchasable_online: true } });
  await withEnvironment(riseSmokeEnvironment, async () => {
    const first = await fixture.api.createMembershipCheckout(generalPlanId, 'G-3');
    const retry = await fixture.api.createMembershipCheckout(generalPlanId, 'G-3');
    assert.equal(first.orderId, retry.orderId);
    assert.equal(fixture.calls.filter(call => call[0] === 'rpc').length, 2);
    assert.equal(fixture.calls.filter(call => call[0] === 'createOrder').length, 1);
  });
});

test('captured smoke payment recovery still settles ₹1 and runs Ahibi issuance after gate expiry', async () => {
  const fixture = await payments({ order: { razorpay_order_id: 'order_smoke' }, fetchedPayments: [
    { id: 'pay_smoke', order_id: 'order_smoke', amount: 100, currency: 'INR', status: 'captured', captured: true },
  ] });
  await withEnvironment({ ...riseSmokeEnvironment, NUSC_RISE_LIVE_SMOKE_TEST_EXPIRES_AT: '2000-01-01T00:00:00Z' }, async () => {
    const result = await fixture.api.recoverMembershipCheckout();
    assert.deepEqual(result, { status: 'paid', ticketStatus: 'issued' });
    const settlement = fixture.calls.find(call => call[0] === 'rpc' && call[1] === 'settle_membership_payment');
    assert.equal(settlement[2].p_amount, 100);
    assert.equal(settlement[2].p_currency, 'INR');
    assert.ok(fixture.calls.some(call => call[0] === 'ensureAhibiPassIssued' && call[2] === 'pay_smoke'));
  });
});

test('browser payment confirmation retains the captured ₹1 and the existing Ahibi issuance path', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key';
  process.env.RAZORPAY_KEY_SECRET = secret;
  try {
    const fixture = await payments({
      order: { razorpay_order_id: validCallback.razorpay_order_id },
      captured: { id: validCallback.razorpay_payment_id, order_id: validCallback.razorpay_order_id,
        amount: 100, currency: 'INR', status: 'captured', captured: true },
    });
    const result = await fixture.api.confirmMembershipCheckout(validCallback);
    assert.deepEqual(result, { status: 'paid', ticketStatus: 'issued' });
    const settlement = fixture.calls.find(call => call[0] === 'rpc' && call[1] === 'settle_membership_payment');
    assert.equal(settlement[2].p_amount, 100);
    assert.ok(fixture.calls.some(call => call[0] === 'ensureAhibiPassIssued' && call[2] === validCallback.razorpay_payment_id));
  } finally {
    if (previous[0] === undefined) delete process.env.RAZORPAY_KEY_ID; else process.env.RAZORPAY_KEY_ID = previous[0];
    if (previous[1] === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = previous[1];
  }
});

test('Razorpay webhook capture still settles a stored ₹1 smoke order', async () => {
  const fixture = await payments();
  const { POST } = await load('apps/web/src/app/api/webhooks/razorpay/route.ts', {
    '@nusc/membership/src/payments': {
      validPaymentSignature: fixture.api.validPaymentSignature,
      settleCapturedPayment: fixture.api.settleCapturedPayment,
    },
  });
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = secret;
  try {
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: {
      id: 'pay_smokewebhook', order_id: 'order_smokewebhook', amount: 100,
      currency: 'INR', status: 'captured', captured: true,
    } } } });
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    const response = await POST(new Request('https://synthetic.invalid/api/webhooks/razorpay', {
      method: 'POST', headers: { 'x-razorpay-signature': signature }, body,
    }));
    assert.equal(response.status, 200);
    const settlement = fixture.calls.find(call => call[0] === 'rpc' && call[1] === 'settle_membership_payment');
    assert.equal(settlement[2].p_amount, 100);
    assert.equal(settlement[2].p_currency, 'INR');
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test('failed gateway creation, amount mismatch or durable binding never returns a usable checkout', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key'; process.env.RAZORPAY_KEY_SECRET = secret;
  const reservedOrder = { id: userId, amount: 1000, currency: 'INR', purpose: 'registration', newly_created: true, razorpay_order_id: null };
  try {
    for (const options of [
      { creationError: new Error('synthetic gateway failure') },
      { bindError: { message: 'synthetic binding failure' } },
      { externalOrder: { id: 'order_wrong', amount: 1, currency: 'INR' } },
    ]) {
      const fixture = await payments({ reservedOrder, ...options });
      await assert.rejects(() => fixture.api.createMembershipCheckout(), /Unable to start payment/);
      assert.ok(fixture.calls.some(call => call[0] === 'adminUpdate' && call[2].status === 'creation_failed'));
    }
    const invalidCredentials = await payments({ reservedOrder,
      creationError: Object.assign(new Error('synthetic authentication failure'), { statusCode: 401 }) });
    await assert.rejects(() => invalidCredentials.api.createMembershipCheckout(), /Payments are temporarily unavailable/);
    assert.ok(invalidCredentials.calls.some(call => call[0] === 'adminUpdate' && call[2].status === 'creation_failed'));
    const leased = await payments({ reservedOrder: { ...reservedOrder, newly_created: false } });
    await assert.rejects(() => leased.api.createMembershipCheckout(), /being prepared/);
    assert.equal(leased.calls.some(call => call[0] === 'createOrder'), false);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('checkout rejects malformed plans and anonymous requests before privileged access', async () => {
  const fixture = await payments({ user: null });
  for (const invalid of ['', 'not-a-plan', {}, 1]) {
    await assert.rejects(() => fixture.api.createMembershipCheckout(invalid), /Invalid membership plan/);
  }
  await assert.rejects(() => fixture.api.createMembershipCheckout(), /sign in/);
  assert.equal(fixture.calls.length, 0);
});

test('checkout maintenance switch blocks new orders and registrations while payment recovery remains available', async () => {
  const previous = process.env.MEMBERSHIP_CHECKOUT_ENABLED;
  process.env.MEMBERSHIP_CHECKOUT_ENABLED = 'false';
  try {
    const fixture = await payments({ order: null });
    await assert.rejects(() => fixture.api.createMembershipCheckout(), /temporarily paused/);
    assert.equal(fixture.calls.length, 0);
    assert.equal((await fixture.api.recoverMembershipCheckout()).status, 'not_found');
    let privilegedAccess = false;
    const registration = await load('packages/membership/src/service.ts', {
      '@nusc/db': { createAdminClient: () => { privilegedAccess = true; throw new Error('must not create an account'); } },
      './schemas': { membershipSchema: { safeParse: data => ({ success: true, data }) } },
      './payments': fixture.api,
    });
    await assert.rejects(() => registration.registerMember({}), /temporarily paused/);
    assert.equal(privilegedAccess, false);
  } finally {
    if (previous === undefined) delete process.env.MEMBERSHIP_CHECKOUT_ENABLED; else process.env.MEMBERSHIP_CHECKOUT_ENABLED = previous;
  }
});

test('null and malformed callbacks fail before authentication or database access', async () => {
  const { api, calls } = await payments();
  for (const callback of [null, undefined, {}, [], { ...validCallback, razorpay_order_id: 'order_bad|pay_other' }, { ...validCallback, razorpay_payment_id: 1 }]) {
    await assert.rejects(() => api.confirmMembershipCheckout(callback), /Invalid payment response/);
  }
  assert.equal(calls.length, 0);
});

test('callback cannot confirm another account order, even with valid signature', async () => {
  const { api, calls } = await payments({ order: null });
  await assert.rejects(() => api.confirmMembershipCheckout(validCallback), /not found for your account/);
  assert.ok(calls.some((call) => call[0] === 'filter' && call[1] === 'user_id' && call[2] === userId));
  assert.equal(calls.some((call) => call[0] === 'fetch' || call[0] === 'rpc'), false);
});

test('unauthenticated callbacks cannot reach payment lookup or settlement', async () => {
  const { api, calls } = await payments({ user: null });
  await assert.rejects(() => api.confirmMembershipCheckout(validCallback), /sign in/);
  assert.equal(calls.length, 0);
});

test('valid signature still requires fetched capture, correct order, and database amount check', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key';
  process.env.RAZORPAY_KEY_SECRET = secret;
  try {
    const authorized = await payments({ captured: { id: 'pay_captured', order_id: 'order_owned', amount: 1000, currency: 'INR', status: 'authorized', captured: false } });
    assert.equal((await authorized.api.confirmMembershipCheckout(validCallback)).status, 'pending');
    assert.equal(authorized.calls.some((call) => call[0] === 'rpc'), false);
    const substituted = await payments({ captured: { id: 'pay_captured', order_id: 'order_other', amount: 1000, currency: 'INR', status: 'captured', captured: true } });
    await assert.rejects(() => substituted.api.confirmMembershipCheckout(validCallback), /order mismatch/);
    assert.equal(substituted.calls.some((call) => call[0] === 'rpc'), false);
    const wrongAmount = await payments({ captured: { id: 'pay_captured', order_id: 'order_owned', amount: 1, currency: 'USD', status: 'captured', captured: true }, dbError: { message: 'mismatch' } });
    await assert.rejects(() => wrongAmount.api.confirmMembershipCheckout(validCallback), /Unable to confirm/);
    const settlement = wrongAmount.calls.find((call) => call[0] === 'rpc');
    assert.equal(settlement[2].p_amount, 1);
    assert.equal(settlement[2].p_currency, 'USD');
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('captured payment helper rejects unsafe or nonpositive amounts without database access', async () => {
  const { api, calls } = await payments();
  for (const amount of [0, -1, NaN, Infinity, 1.25, Number.MAX_SAFE_INTEGER + 1, 'not-a-number']) {
    await assert.rejects(() => api.settleCapturedPayment({ id: 'pay_test', order_id: 'order_owned', amount, currency: 'INR', status: 'captured', captured: true }), /Invalid captured payment/);
  }
  assert.equal(calls.length, 0);
});

test('generic member writes are denied and display roles cannot authorize membership management', async () => {
  const access = await load('apps/admin/src/collections/membership/access.ts', {});
  const { Members } = await load('apps/admin/src/collections/membership/Members.ts', { './access': access });
  for (const user of [null, { roles: ['content_editor'] }, { roles: ['trials_manager'] }, { display_roles: [{ role: 'super_admin' }] }, { roles: ['super_admin'] }]) {
    for (const operation of ['create', 'update', 'delete']) assert.equal(Members.access[operation]({ req: { user } }), false);
  }
  for (const user of [null, { roles: ['content_editor'] }, { roles: ['support'] }, { display_roles: [{ role: 'super_admin' }] }]) {
    assert.equal(access.canManageMembership({ req: { user } }), false);
  }
  assert.equal(access.canManageMembership({ req: { user: { roles: ['store_manager'] } } }), true);
});

test('VIP form uses the full server principal when Payload filters roles from the client projection', async () => {
  const access = await load('apps/admin/src/collections/membership/access.ts', {});
  const { VipActivation } = await load('apps/admin/src/components/membership/VipActivation.tsx', {
    '../../collections/membership/access': access,
    './VipActivationClient': { VipActivationClient: () => null },
  });
  const element = await VipActivation({ id: userId, user: { display_roles: [{ role: 'store_manager' }] }, req: { user: { roles: ['store_manager'] } } });
  assert.equal(element.props.memberId, userId);
  for (const principal of [null, { roles: ['content_editor'] }, { display_roles: [{ role: 'super_admin' }] }]) {
    assert.equal(await VipActivation({ id: userId, user: { roles: ['super_admin'] }, req: { user: principal } }), null);
  }
  assert.equal(await VipActivation({ req: { user: { roles: ['super_admin'] } } }), null);
});

test('VIP activation API rejects cross-origin, null bodies, and insufficient current database roles', async () => {
  const previous = [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://synthetic.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'synthetic-anon-key';
  let roles = [{ role: 'store_manager' }];
  let user = { id: userId, user_metadata: { roles: ['super_admin'] } };
  const calls = [];
  const route = await load('apps/admin/src/app/api/membership/vip-activate/route.ts', {
    '@supabase/ssr': { createServerClient: () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from: () => ({ select: () => ({ eq: async () => ({ data: roles, error: null }) }) }),
      rpc: async (name, args) => { calls.push([name, args]); return { error: null }; },
    }) },
    'next/headers': { cookies: async () => ({ getAll: () => [], set: () => {} }) },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  const request = (body, origin = 'https://admin.synthetic.invalid') => new Request('https://admin.synthetic.invalid/api/membership/vip-activate', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await route.POST(request({ memberId: userId, reference: 'BANK-123' }, 'https://attacker.invalid'))).status, 403);
    for (const body of [null, [], {}, { memberId: userId, reference: '\u0000BAD' }, { memberId: 'invalid', reference: 'BANK-123' }]) {
      assert.equal((await route.POST(request(body))).status, 400);
    }
    roles = [{ role: 'content_editor' }];
    assert.equal((await route.POST(request({ memberId: userId, reference: 'BANK-123' }))).status, 403);
    user = null;
    assert.equal((await route.POST(request({ memberId: userId, reference: 'BANK-123' }))).status, 401);
    assert.equal(calls.length, 0);
    user = { id: userId };
    roles = [{ role: 'store_manager' }];
    assert.equal((await route.POST(request({ memberId: userId, reference: ' BANK-123 ' }))).status, 200);
    assert.deepEqual(calls, [['activate_vip_membership', { p_member_id: userId, p_reference: 'BANK-123' }]]);
  } finally {
    for (const [index, key] of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('webhook fails closed, safely parses null payloads, validates captured entities, and retries settlement failures', async () => {
  const { api } = await payments();
  let rejectSettlement = false;
  const calls = [];
  const { POST } = await load('apps/web/src/app/api/webhooks/razorpay/route.ts', {
    '@nusc/membership/src/payments': {
      validPaymentSignature: api.validPaymentSignature,
      settleCapturedPayment: async (payment) => {
        calls.push(payment);
        if (rejectSettlement) throw new Error('synthetic database failure');
        return { status: 'paid' };
      },
    },
  });
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  const request = (body, signature = createHmac('sha256', secret).update(body).digest('hex')) => new Request('https://synthetic.invalid/api/webhooks/razorpay', {
    method: 'POST', headers: { 'x-razorpay-signature': signature }, body,
  });
  const capture = { event: 'payment.captured', payload: { payment: { entity: {
    id: 'pay_captured', order_id: 'order_owned', amount: 1000, currency: 'INR', status: 'captured', captured: true,
  } } } };
  try {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    assert.equal((await POST(request(JSON.stringify(capture)))).status, 503);
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    assert.equal((await POST(request(JSON.stringify(capture), '0'.repeat(64)))).status, 400);
    assert.equal((await POST(request('{'))).status, 400);
    for (const body of [null, [], {}, { event: 'payment.failed' }]) assert.equal((await POST(request(JSON.stringify(body)))).status, 200);
    for (const entity of [null, {}, { ...capture.payload.payment.entity, captured: false }, { ...capture.payload.payment.entity, status: 'authorized' }, { ...capture.payload.payment.entity, amount: 0 }, { ...capture.payload.payment.entity, order_id: 'order_bad|other' }]) {
      assert.equal((await POST(request(JSON.stringify({ ...capture, payload: { payment: { entity } } })))).status, 400);
    }
    assert.equal(calls.length, 0);
    assert.equal((await POST(request(JSON.stringify(capture)))).status, 200);
    assert.deepEqual(calls[0], capture.payload.payment.entity);
    rejectSettlement = true;
    assert.equal((await POST(request(JSON.stringify(capture)))).status, 500);
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});

test('checkout cancellation requires a signed-in user and only queries that user tier orders', async () => {
  const unauthenticated = await payments({ user: null });
  await assert.rejects(() => unauthenticated.api.cancelMembershipCheckout(), /sign in/);
  assert.equal(unauthenticated.calls.length, 0);
  const noOwnedOrder = await payments({ order: null });
  assert.equal((await noOwnedOrder.api.cancelMembershipCheckout()).status, 'cancelled');
  assert.ok(noOwnedOrder.calls.some((call) => call[0] === 'filter' && call[1] === 'user_id' && call[2] === userId));
  assert.ok(noOwnedOrder.calls.some((call) => call[0] === 'filter' && call[1] === 'purpose' && call[2] === 'tier'));
  assert.ok(noOwnedOrder.calls.some((call) => call[0] === 'filterIn' && call[1] === 'status' && JSON.stringify(call[2]) === JSON.stringify(['creating', 'pending'])));
  assert.equal(noOwnedOrder.calls.some((call) => call[0] === 'rpc' || call[0] === 'fetchPayments'), false);
  const failedLookup = await payments({ lookupError: { message: 'synthetic RLS lookup failure' } });
  await assert.rejects(() => failedLookup.api.cancelMembershipCheckout(), /find your pending checkout/);
  assert.equal(failedLookup.calls.some((call) => call[0] === 'rpc' || call[0] === 'fetchPayments'), false);
});

test('payment recovery rejects anonymous and cross-user lookups without gateway or privileged access', async () => {
  const unauthenticated = await payments({ user: null });
  await assert.rejects(() => unauthenticated.api.recoverMembershipCheckout(), /sign in/);
  assert.equal(unauthenticated.calls.length, 0);
  const noOwnedOrder = await payments({ order: null });
  assert.equal((await noOwnedOrder.api.recoverMembershipCheckout()).status, 'not_found');
  assert.ok(noOwnedOrder.calls.some(call => call[0] === 'filter' && call[1] === 'user_id' && call[2] === userId));
  assert.ok(noOwnedOrder.calls.some(call => call[0] === 'filterIn' && call[1] === 'status' && JSON.stringify(call[2]) === JSON.stringify(['creating', 'pending'])));
  assert.equal(noOwnedOrder.calls.some(call => call[0] === 'rpc' || call[0] === 'fetchPayments'), false);
  const failedLookup = await payments({ lookupError: { message: 'synthetic RLS failure' } });
  await assert.rejects(() => failedLookup.api.recoverMembershipCheckout(), /Unable to check your payment/);
  assert.equal(failedLookup.calls.some(call => call[0] === 'rpc' || call[0] === 'fetchPayments'), false);
  const creating = await payments({ order: { razorpay_order_id: null } });
  assert.equal((await creating.api.recoverMembershipCheckout()).status, 'pending');
  assert.equal(creating.calls.some(call => call[0] === 'rpc' || call[0] === 'fetchPayments'), false);
});

test('recovery settles only a gateway-captured payment bound to the owned order and never creates or cancels payment', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key';
  process.env.RAZORPAY_KEY_SECRET = secret;
  const captured = { id: 'pay_captured', order_id: 'order_owned', amount: 1000, currency: 'INR', status: 'captured', captured: true };
  try {
    for (const fetchedPayments of [[], [{ ...captured, status: 'authorized', captured: false }], [{ ...captured, status: 'failed', captured: false }]]) {
      const pending = await payments({ fetchedPayments });
      assert.equal((await pending.api.recoverMembershipCheckout()).status, 'pending');
      assert.equal(pending.calls.some(call => call[0] === 'rpc'), false);
    }
    const paid = await payments({ fetchedPayments: [captured] });
    assert.equal((await paid.api.recoverMembershipCheckout()).status, 'paid');
    assert.deepEqual(paid.calls.find(call => call[0] === 'rpc'), ['rpc', 'settle_membership_payment', {
      p_order_id: 'order_owned', p_payment_id: 'pay_captured', p_amount: 1000, p_currency: 'INR',
    }]);
    const substituted = await payments({ fetchedPayments: [{ ...captured, order_id: 'order_other' }] });
    await assert.rejects(() => substituted.api.recoverMembershipCheckout(), /order mismatch/);
    assert.equal(substituted.calls.some(call => call[0] === 'rpc'), false);
    const gatewayDown = await payments({ gatewayError: new Error('synthetic gateway outage') });
    await assert.rejects(() => gatewayDown.api.recoverMembershipCheckout(), /synthetic gateway outage/);
    assert.equal(gatewayDown.calls.some(call => call[0] === 'rpc'), false);
    const dbDown = await payments({ fetchedPayments: [captured], dbError: { message: 'synthetic database outage' } });
    await assert.rejects(() => dbDown.api.recoverMembershipCheckout(), /Unable to confirm payment/);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('checkout cancellation checks provider capture and authorization before cancelling the exact stored order', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'synthetic-key';
  process.env.RAZORPAY_KEY_SECRET = secret;
  const order = { id: '22222222-2222-4222-8222-222222222222', razorpay_order_id: 'order_owned' };
  try {
    const captured = { id: 'pay_captured', order_id: 'order_owned', amount: 300000, currency: 'INR', status: 'captured', captured: true };
    const alreadyPaid = await payments({ order, fetchedPayments: [captured] });
    assert.equal((await alreadyPaid.api.cancelMembershipCheckout()).status, 'paid');
    assert.deepEqual(alreadyPaid.calls.find((call) => call[0] === 'fetchPayments'), ['fetchPayments', order.razorpay_order_id]);
    assert.equal(alreadyPaid.calls.some((call) => call[0] === 'rpc' && call[1] === 'cancel_membership_payment'), false);
    assert.deepEqual(alreadyPaid.calls.find((call) => call[0] === 'rpc'), ['rpc', 'settle_membership_payment', {
      p_order_id: 'order_owned', p_payment_id: 'pay_captured', p_amount: 300000, p_currency: 'INR',
    }]);
    const authorized = await payments({ order, fetchedPayments: [{ ...captured, status: 'authorized', captured: false }] });
    await assert.rejects(() => authorized.api.cancelMembershipCheckout(), /Payment is processing/);
    assert.equal(authorized.calls.some((call) => call[0] === 'rpc'), false);
    const abandoned = await payments({ order, fetchedPayments: [{ ...captured, status: 'failed', captured: false }] });
    assert.equal((await abandoned.api.cancelMembershipCheckout()).status, 'cancelled');
    assert.deepEqual(abandoned.calls.find((call) => call[0] === 'rpc'), ['rpc', 'cancel_membership_payment', {
      p_user_id: userId, p_order_id: order.id,
    }]);
    assert.ok(abandoned.calls.findIndex((call) => call[0] === 'fetchPayments') < abandoned.calls.findIndex((call) => call[0] === 'rpc'));
    const unavailable = await payments({ order, gatewayError: new Error('synthetic gateway outage') });
    await assert.rejects(() => unavailable.api.cancelMembershipCheckout(), /synthetic gateway outage/);
    assert.equal(unavailable.calls.some((call) => call[0] === 'rpc'), false);
    const invalidCapture = await payments({ order, fetchedPayments: [{ ...captured, amount: 0 }] });
    await assert.rejects(() => invalidCapture.api.cancelMembershipCheckout(), /Invalid captured payment/);
    assert.equal(invalidCapture.calls.some((call) => call[0] === 'rpc'), false);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

test('unbound creating tier cancellation uses the exact stored order and authenticated identity without payment credentials', async () => {
  const previous = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  const order = { id: '22222222-2222-4222-8222-222222222222', razorpay_order_id: null };
  try {
    const creating = await payments({ order });
    assert.equal((await creating.api.cancelMembershipCheckout()).status, 'cancelled');
    assert.equal(creating.calls.some((call) => call[0] === 'fetchPayments'), false);
    assert.deepEqual(creating.calls.find((call) => call[0] === 'rpc'), ['rpc', 'cancel_membership_payment', { p_user_id: userId, p_order_id: order.id }]);
    const failed = await payments({ order, dbError: { message: 'synthetic cancellation database error' } });
    await assert.rejects(() => failed.api.cancelMembershipCheckout(), /Unable to cancel checkout/);
  } finally {
    for (const [index, key] of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].entries()) {
      if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index];
    }
  }
});

async function dashboard({ user = { id: userId, email: 'member@synthetic.invalid' }, member = null, historicalPlan = null, memberError = null, adminError = null } = {}) {
  const calls = [];
  const catalogue = [
    { id: 'active-general', slug: 'rise-general', is_active: true, price: 300000 },
    { id: 'inactive-premium', slug: 'rise-premium', is_active: false, price: 1000000 },
    { id: 'active-vip', slug: 'rise-vip-box', is_active: true, price: 45000000 },
    { id: 'other-plan', slug: 'legacy-other', is_active: true, price: 123 },
  ];
  const session = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table) => {
      calls.push(['sessionTable', table]);
      const filters = [];
      const chain = {
        select: (fields) => { calls.push(['sessionSelect', table, fields]); return chain; },
        eq: (key, value) => { calls.push(['sessionFilter', table, key, value]); filters.push([key, value]); return chain; },
        in: (key, values) => { calls.push(['sessionFilterIn', table, key, values]); filters.push([key, values]); return chain; },
        limit: (count) => { calls.push(['sessionLimit', table, count]); return chain; },
        maybeSingle: async () => ({ data: table === 'members' ? member : null, error: table === 'members' ? memberError : null }),
        order: () => table === 'membership_benefits' ? chain : Promise.resolve({
          data: catalogue.filter((plan) => filters.every(([key, value]) => Array.isArray(value) ? value.includes(plan[key]) : plan[key] === value)), error: null,
        }),
      };
      return chain;
    },
  };
  const api = await load('apps/web/src/app/dashboard/service.ts', {
    '@nusc/db': {
      createServerClient: async () => session,
      createAdminClient: () => {
        calls.push(['adminClient']);
        return { from: (table) => {
          calls.push(['adminTable', table]);
          const chain = {
            select: (fields) => { calls.push(['adminSelect', fields]); return chain; },
            eq: (key, value) => { calls.push(['adminFilter', key, value]); return chain; },
            single: async () => ({ data: historicalPlan, error: adminError }),
          };
          return chain;
        } };
      },
    },
  });
  return { api, calls };
}

test('dashboard never creates a privileged plan client without an authenticated member needing fallback', async () => {
  const unauthenticated = await dashboard({ user: null });
  await assert.rejects(() => unauthenticated.api.getDashboardData(), /Unauthorized/);
  assert.equal(unauthenticated.calls.length, 0);
  const noMember = await dashboard();
  assert.equal((await noMember.api.getDashboardData()).membership, null);
  assert.equal(noMember.calls.some((call) => call[0] === 'adminClient'), false);
  const visiblePlan = { id: 'visible-plan', slug: 'rise-general' };
  const existing = await dashboard({ member: { id: 'own-member', plan_id: visiblePlan.id, plan: visiblePlan } });
  assert.deepEqual((await existing.api.getDashboardData()).membership.plan, visiblePlan);
  assert.equal(existing.calls.some((call) => call[0] === 'adminClient'), false);
  const failedMemberLookup = await dashboard({ memberError: { message: 'synthetic member lookup failure' } });
  await assert.rejects(() => failedMemberLookup.api.getDashboardData(), /Unable to load membership/);
  assert.equal(failedMemberLookup.calls.some((call) => call[0] === 'adminClient'), false);
});

test('historical plan fallback uses only the authenticated member stored plan ID and explicit public fields', async () => {
  const plan = { id: 'historical-owned-plan', name: 'Historical Rise Premium', slug: 'rise-premium', price: 1000000,
    billing_cycle: 'annual', description: 'Existing member plan', is_purchasable_online: false, is_active: false };
  const fixture = await dashboard({ member: { id: 'own-member', plan_id: plan.id, plan: null }, historicalPlan: plan });
  const result = await fixture.api.getDashboardData('attacker-supplied-plan');
  assert.deepEqual(result.membership.plan, plan);
  assert.deepEqual(fixture.calls.filter((call) => call[0].startsWith('admin')), [
    ['adminClient'], ['adminTable', 'membership_plans'],
    ['adminSelect', 'id,name,slug,price,billing_cycle,description,is_purchasable_online,is_active'],
    ['adminFilter', 'id', plan.id],
  ]);
  assert.ok(fixture.calls.some((call) => call[0] === 'sessionFilter' && call[1] === 'members' && call[2] === 'user_id' && call[3] === userId));
  assert.ok(fixture.calls.some((call) => call[0] === 'sessionFilter' && call[1] === 'membership_plans' && call[2] === 'is_active' && call[3] === true));
  assert.ok(fixture.calls.some((call) => call[0] === 'sessionFilterIn' && call[1] === 'membership_plans' && call[2] === 'slug'
    && JSON.stringify(call[3]) === JSON.stringify(['rise-general', 'rise-premium', 'rise-vip-box'])));
  assert.deepEqual(result.availablePlans.map((available) => available.id), ['active-general', 'active-vip']);
  assert.equal(result.availablePlans.some((available) => available.id === plan.id || !available.is_active), false);
});

test('historical plan lookup failure stops dashboard loading without returning incomplete or unrelated plan data', async () => {
  for (const options of [{ historicalPlan: null }, { historicalPlan: { id: 'owned-plan' }, adminError: { message: 'synthetic privileged lookup error' } }]) {
    const fixture = await dashboard({ member: { id: 'own-member', plan_id: 'owned-plan', plan: null }, ...options });
    await assert.rejects(() => fixture.api.getDashboardData(), /Unable to load membership plan/);
    assert.deepEqual(fixture.calls.find((call) => call[0] === 'adminFilter'), ['adminFilter', 'id', 'owned-plan']);
  }
});
