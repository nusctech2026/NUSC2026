import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);

async function load(relativePath, mocks = {}) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(
    name => name in mocks ? mocks[name] : require(name), loaded, loaded.exports,
  );
  return loaded.exports;
}

function form(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

async function withEnv(values, callback) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try { return await callback(); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function nextResponseStub() {
  return class NextResponse {
    constructor(body, options) { this.body = body; this.status = options.status; this.headers = options.headers; }
    static redirect(url, options) { return { url: url.toString(), options }; }
  };
}

test('login page links to forgot-password', async () => {
  const source = await readFile(new URL('../apps/web/src/components/auth/LoginForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /href="\/forgot-password"[\s\S]*?Forgot password\?/);
});

test('reset request normalizes email, uses configured callback, and hides account/rate-limit outcomes', async () => {
  await withEnv({ NEXT_PUBLIC_SITE_URL: 'https://members.example.test/untrusted/path', NODE_ENV: 'test' }, async () => {
    const helper = await load('apps/web/src/app/forgot-password/recovery-url.ts');
    const calls = [];
    let providerError = null;
    const { requestPasswordReset } = await load('apps/web/src/app/forgot-password/actions.ts', {
      '@nusc/db': { createServerClient: async () => ({ auth: {
        resetPasswordForEmail: async (email, options) => {
          calls.push([email, options.redirectTo]);
          return { error: providerError };
        },
      } }) },
      './recovery-url': helper,
    });
    const known = await requestPasswordReset(form({ email: ' MEMBER@EXAMPLE.TEST ' }));
    providerError = { code: 'over_email_send_rate_limit' };
    const originalLog = console.error;
    console.error = () => {};
    let unknown;
    try { unknown = await requestPasswordReset(form({ email: 'unknown@example.test' })); }
    finally { console.error = originalLog; }
    assert.deepEqual(known, unknown);
    assert.deepEqual(calls, [
      ['member@example.test', 'https://members.example.test/auth/recovery'],
      ['unknown@example.test', 'https://members.example.test/auth/recovery'],
    ]);
  });
});

test('invalid email is rejected before creating an auth client', async () => {
  let clientCreations = 0;
  const helper = await load('apps/web/src/app/forgot-password/recovery-url.ts');
  const { requestPasswordReset } = await load('apps/web/src/app/forgot-password/actions.ts', {
    '@nusc/db': { createServerClient: async () => { clientCreations++; throw new Error('must not be called'); } },
    './recovery-url': helper,
  });
  for (const email of ['', 'bad-address', 'two@@example.test', 'x'.repeat(250) + '@example.test']) {
    assert.deepEqual(await requestPasswordReset(form({ email })), { error: 'Enter a valid email address.' });
  }
  assert.equal(clientCreations, 0);
});

test('recovery origin permits configured HTTPS and local development only', async () => {
  const helper = await load('apps/web/src/app/forgot-password/recovery-url.ts');
  await withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: undefined }, async () => {
    assert.equal(helper.recoveryCallbackUrl(), 'http://localhost:3100/auth/recovery');
  });
  await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://members.example.test/base?x=1' }, async () => {
    assert.equal(helper.recoveryCallbackUrl(), 'https://members.example.test/auth/recovery');
  });
  await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: undefined }, async () => {
    assert.throws(() => helper.recoverySiteOrigin(), /not configured/);
  });
  await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://members.example.test' }, async () => {
    assert.throws(() => helper.recoverySiteOrigin(), /HTTPS/);
  });
  await withEnv({ NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://evil.example.test' }, async () => {
    assert.throws(() => helper.recoverySiteOrigin(), /HTTPS/);
  });
});

test('recovery callback exchanges the code and redirects to configured origin, not incoming Host or next', async () => {
  await withEnv({ NODE_ENV: 'test', NEXT_PUBLIC_SITE_URL: 'https://members.example.test' }, async () => {
    const exchanges = [];
    let shouldFail = false;
    const helper = await load('apps/web/src/app/forgot-password/recovery-url.ts');
    const { GET } = await load('apps/web/src/app/auth/recovery/route.ts', {
      '@nusc/db': { createServerClient: async () => ({ auth: {
        exchangeCodeForSession: async (code, options) => {
          exchanges.push([code, options]);
          return { error: shouldFail ? new Error('expired') : null };
        },
      } }) },
      'next/server': { NextResponse: nextResponseStub() },
      '../../forgot-password/recovery-url': helper,
    });
    const success = await GET(new Request('https://attacker.example.test/auth/recovery?code=single-use&sb_flow_id=flow-1&next=https://evil.test'));
    assert.equal(success.url, 'https://members.example.test/reset-password');
    assert.deepEqual(exchanges, [['single-use', { flowId: 'flow-1' }]]);
    assert.equal(success.options.headers['Cache-Control'], 'no-store');
    shouldFail = true;
    const expired = await GET(new Request('https://attacker.example.test/auth/recovery?code=expired'));
    assert.equal(expired.url, 'https://members.example.test/reset-password?error=expired');
    const missing = await GET(new Request('https://attacker.example.test/auth/recovery'));
    assert.equal(missing.url, expired.url);
    assert.equal(exchanges.length, 2);
  });
});

test('production callback fails closed when the canonical site URL is missing', async () => {
  await withEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: undefined }, async () => {
    let clientCreations = 0;
    const helper = await load('apps/web/src/app/forgot-password/recovery-url.ts');
    const { GET } = await load('apps/web/src/app/auth/recovery/route.ts', {
      '@nusc/db': { createServerClient: async () => { clientCreations++; throw new Error('must not connect'); } },
      'next/server': { NextResponse: nextResponseStub() },
      '../../forgot-password/recovery-url': helper,
    });
    const result = await GET(new Request('https://attacker.example.test/auth/recovery?code=one-time'));
    assert.equal(result.status, 503);
    assert.equal(result.headers['Cache-Control'], 'no-store');
    assert.equal(clientCreations, 0);
  });
});

test('password update requires an authenticated reset session, validates input, and signs out after success', async () => {
  const calls = [];
  let user = null;
  let updateError = null;
  let signOutError = null;
  const { updatePassword } = await load('apps/web/src/app/reset-password/actions.ts', {
    '@nusc/db': { createServerClient: async () => ({ auth: {
      getUser: async () => ({ data: { user }, error: null }),
      updateUser: async data => { calls.push(['update', data]); return { error: updateError }; },
      signOut: async () => { calls.push(['signout']); return { error: signOutError }; },
    } }) },
  });
  const submitted = form({ password: 'strong-password-1', confirmation: 'strong-password-1' });
  assert.match((await updatePassword(form({ password: 'short', confirmation: 'short' }))).error, /at least 8/);
  assert.match((await updatePassword(form({ password: 'strong-password-1', confirmation: 'different-password' }))).error, /do not match/);
  assert.deepEqual(calls, []);
  assert.match((await updatePassword(submitted)).error, /invalid or has expired/);
  assert.deepEqual(calls, []);
  user = { id: 'synthetic-member' };
  updateError = new Error('provider error');
  assert.match((await updatePassword(submitted)).error, /Unable to update/);
  assert.deepEqual(calls, [['update', { password: 'strong-password-1' }]]);
  calls.length = 0;
  updateError = null;
  assert.deepEqual(await updatePassword(submitted), { success: true });
  assert.deepEqual(calls, [['update', { password: 'strong-password-1' }], ['signout']]);
  calls.length = 0;
  signOutError = new Error('cookie error');
  assert.match((await updatePassword(submitted)).error, /sign-out failed/);
  assert.deepEqual(calls, [['update', { password: 'strong-password-1' }], ['signout']]);
});