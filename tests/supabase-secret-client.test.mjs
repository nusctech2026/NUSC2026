import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminClient } from '../packages/db/src/client/admin.ts';
import { createSupabaseSecretClient } from '../packages/db/src/client/secret-key-client.mjs';

const syntheticUrl = 'https://synthetic-project.invalid';
const syntheticKey = 'sb_secret_synthetic_test_only';

test('database, RPC, and Auth Admin requests use the secret key as apikey only', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const requests = [];

  process.env.NEXT_PUBLIC_SUPABASE_URL = syntheticUrl;
  process.env.SUPABASE_SECRET_KEY = syntheticKey;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async (input, init) => {
    requests.push({ url: input instanceof Request ? input.url : String(input), headers: new Headers(init?.headers) });
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
    });
  };

  try {
    const client = createAdminClient();
    const query = await client.from('members').select('id');
    const rpc = await client.rpc('create_member_profile_and_record', { p_user_id: 'synthetic-user' });
    const authAdmin = await client.auth.admin.listUsers();
    assert.equal(query.error, null);
    assert.equal(rpc.error, null);
    assert.equal(authAdmin.error, null);
    assert.equal(requests.length, 3);
    for (const request of requests) {
      assert.equal(request.headers.get('apikey'), syntheticKey);
      assert.equal(request.headers.get('Authorization'), null);
    }
    assert.ok(requests.some(({ url }) => url.includes('/auth/v1/admin/users')));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});

test('privileged client rejects a missing key or a malformed configured secret key', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = syntheticUrl;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.throws(() => createAdminClient(), /Missing Supabase environment variables/);
    process.env.SUPABASE_SECRET_KEY = 'synthetic_legacy_key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service-role-key';
    assert.throws(() => createAdminClient(), /must be a Supabase secret key/);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});

test('legacy service-role environment variable remains supported without auth session persistence', async () => {
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  const previousServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const requests = [];
  const serviceRoleKey = 'synthetic-service-role-key';

  process.env.NEXT_PUBLIC_SUPABASE_URL = syntheticUrl;
  delete process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  globalThis.fetch = async (input, init) => {
    requests.push(new Headers(init?.headers));
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
    });
  };

  try {
    const client = createAdminClient();
    const { error } = await client.from('members').select('id');
    const { data: sessionData } = await client.auth.getSession();
    assert.equal(error, null);
    assert.equal(sessionData.session, null);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].get('apikey'), serviceRoleKey);
    assert.equal(requests[0].get('Authorization'), `Bearer ${serviceRoleKey}`);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    if (previousServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRoleKey;
  }
});

test('admin client rejects browser execution', () => {
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    assert.throws(() => createAdminClient(), /only be used on the server/);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('secret-key header cleanup preserves a separately supplied user bearer token', async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push(new Headers(init?.headers));
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' },
    });
  };

  try {
    const client = createSupabaseSecretClient(syntheticUrl, syntheticKey, {
      global: { headers: { Authorization: 'Bearer synthetic-user-jwt' } },
    });
    const { error } = await client.from('members').select('id');
    assert.equal(error, null);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].get('Authorization'), 'Bearer synthetic-user-jwt');
  } finally {
    globalThis.fetch = previousFetch;
  }
});
