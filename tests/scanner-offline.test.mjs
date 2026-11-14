import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import {
  accreditationCategories,
  classifyServerResult,
  findSnapshotCredential,
  isRecognizedScannerCredential,
  isSnapshotUsable,
  normalizeScannerCredential,
  retryDelayMs,
  sha256Hex,
} from '../apps/scanner/src/lib/offline-model.ts';

const staffUserId = 'b99b32a8-b588-48d3-9f8e-73e2c5c6be63';
const eventId = '6b43b6da-61e0-4505-bb39-58898578956b';
const qrToken = '0123456789abcdef'.repeat(4);
const printedId = 'NUSC-ID-2026-0123456789ABCDEF';

async function makeSnapshot(overrides = {}) {
  return {
    version: 1,
    snapshotId: '887a6331-567d-43df-b48c-21c6bf4fc862',
    staffUserId,
    issuedAt: '2026-11-13T09:00:00.000Z',
    expiresAt: '2026-11-13T17:00:00.000Z',
    event: {
      id: eventId,
      title: 'NUSC home match',
      startDate: '2026-11-13T00:00:00.000Z',
      endDate: '2026-11-14T00:00:00.000Z',
      isTest: false,
    },
    credentials: [{
      tokenHash: await sha256Hex(qrToken),
      printedIdHash: await sha256Hex(printedId),
      idNumber: printedId,
      fullName: 'Test Workforce Member',
      category: 'volunteer',
      role: 'Gate Volunteer',
      photoAvailable: false,
      validFrom: '2026-11-13T08:00:00.000Z',
      validUntil: '2026-11-13T18:00:00.000Z',
    }],
    ...overrides,
  };
}

test('offline roster recognizes all current unified workforce categories', () => {
  assert.deepEqual(accreditationCategories, [
    'ahibi', 'volunteer', 'media', 'crew', 'management', 'officials', 'medical',
  ]);
});

test('offline matcher accepts a credential in each accreditation category', async () => {
  for (const [index, category] of accreditationCategories.entries()) {
    const categoryToken = String(index + 1).padStart(64, '0');
    const categoryId = `NUSC-ID-2026-${String(index + 1).padStart(6, '0')}`;
    const snapshot = await makeSnapshot({
      credentials: [{
        tokenHash: await sha256Hex(categoryToken),
        printedIdHash: await sha256Hex(categoryId),
        idNumber: categoryId,
        fullName: `Test ${category}`,
        category,
        role: `${category} role`,
        photoAvailable: false,
        validFrom: '2026-11-13T08:00:00.000Z',
        validUntil: '2026-11-13T18:00:00.000Z',
      }],
    });

    assert.equal(
      (await findSnapshotCredential(snapshot, categoryToken, '2026-11-13T10:00:00.000Z'))?.category,
      category,
    );
  }
});

test('offline matcher recognizes QR tokens and printed IDs only inside credential validity', async () => {
  const snapshot = await makeSnapshot();
  assert.equal(isRecognizedScannerCredential(qrToken), true);
  assert.equal(isRecognizedScannerCredential(printedId.toLowerCase()), true);
  assert.equal(isRecognizedScannerCredential('NUSC-ID-2026-ABC'), false);
  assert.equal(normalizeScannerCredential(` ${printedId.toLowerCase()} `), printedId);

  assert.equal((await findSnapshotCredential(snapshot, qrToken, '2026-11-13T10:00:00.000Z'))?.idNumber, printedId);
  assert.equal((await findSnapshotCredential(snapshot, ` ${printedId.toLowerCase()} `, '2026-11-13T10:00:00.000Z'))?.category, 'volunteer');
  assert.equal(await findSnapshotCredential(snapshot, qrToken, '2026-11-13T07:59:59.000Z'), null);
  assert.equal(await findSnapshotCredential(snapshot, qrToken, '2026-11-13T18:00:01.000Z'), null);
  assert.equal((await findSnapshotCredential(snapshot, qrToken, '2026-11-13T18:00:01.000Z', 'check_out'))?.idNumber, printedId);
  assert.equal(await findSnapshotCredential(snapshot, 'a'.repeat(64), '2026-11-13T10:00:00.000Z'), null);
});

test('offline authorization lease is limited to its staff account, match, and expiry', async () => {
  const snapshot = await makeSnapshot();
  const at = Date.parse('2026-11-13T12:00:00.000Z');
  assert.equal(isSnapshotUsable(snapshot, staffUserId, eventId, at), true);
  assert.equal(isSnapshotUsable(snapshot, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', eventId, at), false);
  assert.equal(isSnapshotUsable(snapshot, staffUserId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', at), false);
  assert.equal(isSnapshotUsable(snapshot, staffUserId, eventId, Date.parse(snapshot.expiresAt)), false);
  assert.equal(isSnapshotUsable(null, staffUserId, eventId, at), false);
});

test('server outcomes distinguish confirmed, duplicate conflicts, and rejection', () => {
  assert.equal(classifyServerResult({ success: true }), 'confirmed');
  assert.equal(classifyServerResult({ success: false, code: 'ALREADY_CHECKED_IN' }), 'conflict');
  assert.equal(classifyServerResult({ success: false, code: 'ALREADY_CHECKED_OUT' }), 'conflict');
  assert.equal(classifyServerResult({ success: false, code: 'IDEMPOTENCY_CONFLICT' }), 'conflict');
  assert.equal(classifyServerResult({ success: false, code: 'INVALID_TOKEN' }), 'rejected');
});

test('retry backoff is bounded', () => {
  assert.equal(retryDelayMs(0), 1_000);
  assert.equal(retryDelayMs(3), 4_000);
  assert.equal(retryDelayMs(99), 60_000);
});

test('database receipt retries once, rejects operation reuse, and hides candidate data', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20261113100000_campaign_scan_idempotency.sql', import.meta.url), 'utf8');
  const db = new PGlite();
  const operationId = 'd780fb3f-05c4-4a32-b377-a724bab34d6c';
  const otherStaffId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const attendanceArgs = [
    operationId,
    staffUserId,
    qrToken,
    printedId,
    'check_in',
    'gate',
    'Gate 1',
    eventId,
    'scanner@example.test',
  ];

  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA extensions;
      CREATE FUNCTION extensions.digest(value bytea, algorithm text) RETURNS bytea
        LANGUAGE sql IMMUTABLE AS $$
          SELECT decode(md5(encode(value, 'hex')) || md5(encode(value, 'hex') || algorithm), 'hex')
        $$;
      CREATE TABLE public.scan_invocations (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
      CREATE FUNCTION public.record_campaign_attendance_scan(
        p_qr_token text, p_action text, p_checkpoint_type text,
        p_checkpoint text, p_event_id uuid, p_scanned_by text
      ) RETURNS jsonb LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO public.scan_invocations DEFAULT VALUES;
        RETURN jsonb_build_object(
          'success', true,
          'action', p_action,
          'candidate', jsonb_build_object('id_number', 'NUSC-ID-2026-0123456789ABCDEF', 'full_name', 'Private Candidate')
        );
      END;
      $$;
    `);
    await db.exec(migration);

    const call = (args) => db.query(
      `SELECT public.record_campaign_attendance_scan_idempotent(
        $1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::uuid, $9::text
      ) AS result`,
      args,
    );

    const first = (await call(attendanceArgs)).rows[0].result;
    assert.equal(first.success, true);
    assert.equal(first.idempotent_replay, false);
    assert.equal(first.candidate.full_name, 'Private Candidate');

    const replay = (await call(attendanceArgs)).rows[0].result;
    assert.equal(replay.success, true);
    assert.equal(replay.idempotent_replay, true);
    assert.equal('candidate' in replay, false);

    const renamedScanner = [...attendanceArgs];
    renamedScanner[8] = 'renamed-scanner@example.test';
    assert.equal((await call(renamedScanner)).rows[0].result.idempotent_replay, true);

    const reissuedCredential = [...attendanceArgs];
    reissuedCredential[2] = 'fedcba9876543210'.repeat(4);
    assert.equal((await call(reissuedCredential)).rows[0].result.idempotent_replay, true);

    const conflictingStaff = [...attendanceArgs];
    conflictingStaff[1] = otherStaffId;
    assert.equal((await call(conflictingStaff)).rows[0].result.code, 'IDEMPOTENCY_CONFLICT');

    const conflictingPayload = [...attendanceArgs];
    conflictingPayload[4] = 'check_out';
    assert.equal((await call(conflictingPayload)).rows[0].result.code, 'IDEMPOTENCY_CONFLICT');

    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.scan_invocations')).rows[0].count, 1);
    assert.equal((await db.query("SELECT response ? 'candidate' AS has_candidate FROM public.campaign_scan_idempotency")).rows[0].has_candidate, false);
    assert.equal((await db.query("SELECT has_table_privilege('service_role', 'public.campaign_scan_idempotency', 'SELECT') AS can_read")).rows[0].can_read, false);
    assert.equal((await db.query("SELECT has_function_privilege('anon', 'public.record_campaign_attendance_scan_idempotent(uuid,uuid,text,text,text,text,text,uuid,text)', 'EXECUTE') AS can_execute")).rows[0].can_execute, false);
    assert.equal((await db.query("SELECT has_function_privilege('service_role', 'public.record_campaign_attendance_scan_idempotent(uuid,uuid,text,text,text,text,text,uuid,text)', 'EXECUTE') AS can_execute")).rows[0].can_execute, true);
    const retention = (await db.query(`
      SELECT obj_description('public.campaign_scan_idempotency'::regclass) AS policy
    `)).rows[0].policy;
    assert.match(retention, /retained indefinitely/i);
    assert.match(retention, /no automatic cleanup/i);
  } finally {
    await db.close();
  }
});
