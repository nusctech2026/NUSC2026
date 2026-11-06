import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accreditationDatabase, applicant, campaignSql, credential } from './fixtures/campaign-database.mjs';

const managerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const managerEmail = 'manager@example.invalid';

async function createProdEquivalentDatabase() {
  const db = await accreditationDatabase({ withAttendanceMigration: true });
  try {
    await db.exec(await campaignSql('20261105100000_campaign_review_and_attendance_safe_delete.sql'));
    await db.exec(`
      ALTER TABLE public.campaign_events
        ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
      CREATE POLICY campaign_test_events_not_public
        ON public.campaign_events FOR SELECT TO anon, authenticated
        USING (NOT is_test);
    `);

    // Production's current issuer already excludes TEST events from the season
    // maximum, but the assigned-event query is unfiltered. Reproduce the live
    // pg_get_functiondef shape without relying on the migration's stale body.
    const issuer = (await db.query(
      "SELECT pg_get_functiondef('public.issue_campaign_id(uuid,text,boolean)'::regprocedure) AS definition",
    )).rows[0].definition;
    const productionIssuer = issuer.replace(
      /WHERE\s+event\.is_active(?=\s*\))/gi,
      'WHERE event.is_active AND NOT event.is_test',
    );
    assert.notEqual(productionIssuer, issuer, 'production-equivalent issuer should carry the live TEST predicate');
    await db.exec(productionIssuer);

    const inserted = await db.query(`
      INSERT INTO public.campaign_events(title,slug,venue,start_date,end_date,is_active,is_test)
      VALUES
        ('NUSC vs TEST TEAM 1','synthetic-test-1','TEST',now()-interval '1 hour',now()+interval '1 hour',true,true),
        ('NUSC VS TEST 2','synthetic-test-2','TEST',now()-interval '2 hours',now()+interval '2 hours',true,false),
        ('NUSC VS TEST 3','synthetic-test-3','TEST',now()+interval '1 day',now()+interval '2 days',true,false),
        ('NUSC VS TEST4','synthetic-test-4','TEST',now()+interval '1 day',now()+interval '2 days',true,false),
        ('NUSC VS TEST 5','synthetic-test-5','TEST',now()+interval '1 day',now()+interval '2 days',true,false),
        ('NUSC VS TEST 6','synthetic-test-6','TEST',now()+interval '1 day',now()+interval '2 days',true,false),
        ('NUSC VS TEST 7','synthetic-test-7','TEST',now()+interval '1 day',now()+interval '2 days',true,false),
        ('Prod-equivalent official match A','synthetic-official-a','Synthetic stadium',now()-interval '2 days',now()+interval '2 days',true,false),
        ('Prod-equivalent official match B','synthetic-official-b','Synthetic stadium',now()-interval '1 hour',now()+interval '1 hour',true,false),
        ('Inactive official match','synthetic-inactive','Synthetic stadium',now()-interval '10 days',now()+interval '1 day',false,false)
      RETURNING id,title,is_test
    `);
    const eventByTitle = Object.fromEntries(inserted.rows.map(row => [row.title, row]));

    const allApplication = await applicant(db, { status: 'approved' });
    await db.query(`UPDATE public.campaign_applications
      SET assigned_role_id=preferred_role_id, availability_mode='all', availability_match_ids='{}'
      WHERE id=$1`, [allApplication.id]);
    await asServiceRole(db, () => db.query('SELECT public.issue_campaign_id($1,$2,false)', [allApplication.id, managerEmail]));
    const allCredential = await credential(db, allApplication);

    await db.query(`INSERT INTO public.campaign_attendance(
      event_id,application_id,campaign_id,action,checkpoint_type,gate,scanned_by,scanned_at
    )
    SELECT CASE WHEN row_number <= 25 THEN $1::uuid ELSE $2::uuid END,
      $3,$4,'duplicate_attempt','gate','Gate 1','prior-test-attendance',now()
    FROM generate_series(1,49) AS rows(row_number)`, [
      eventByTitle['NUSC vs TEST TEAM 1'].id,
      eventByTitle['NUSC VS TEST 2'].id,
      allApplication.id,
      allCredential.id,
    ]);

    return { db, eventByTitle, allApplication, allCredential };
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function asServiceRole(db, operation) {
  await db.exec('SET ROLE service_role');
  try { return await operation(); } finally { await db.exec('RESET ROLE'); }
}

async function recordScan(db, token, eventId, action = 'check_in') {
  return asServiceRole(db, async () => (await db.query(`SELECT public.record_campaign_attendance_scan(
    $1,$2,'gate','Gate 1',$3,'synthetic-gate-staff'
  ) AS result`, [token, action, eventId])).rows[0].result);
}

async function createTestEvent(db, title, date) {
  const result = await asServiceRole(db, async () => (await db.query(`SELECT public.create_campaign_test_match(
    $1,
    ($2::date::timestamp AT TIME ZONE 'Asia/Kolkata'),
    ((($2::date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata') - interval '1 millisecond')
  ) AS result`, [title, date])).rows[0].result);
  return result;
}

test('production-equivalent workforce migrations preserve credentials and attendance, enforce RLS, and support multi-match scans', async () => {
  const { db, eventByTitle, allApplication, allCredential } = await createProdEquivalentDatabase();
  try {
    const beforeCredential = await credential(db, allApplication);
    const beforeApplication = (await db.query(`SELECT application_status,availability_mode,availability_match_ids
      FROM public.campaign_applications WHERE id=$1`, [allApplication.id])).rows[0];
    const testRowsBefore = (await db.query(`SELECT id,title,is_test FROM public.campaign_events
      WHERE title ILIKE '%TEST%' AND venue ILIKE '%TEST%' ORDER BY title`)).rows;
    const testAttendanceBefore = (await db.query(`SELECT event_id,count(*)::int AS count
      FROM public.campaign_attendance GROUP BY event_id ORDER BY event_id`)).rows;
    assert.deepEqual(testAttendanceBefore.map(row => row.count).sort((a, b) => a - b), [24, 25]);

    await db.exec(await campaignSql('20261106140000_workforce_test_matches_and_season_access.sql'));
    await db.exec(await campaignSql('20261106150000_seed_nusc_official_home_matches.sql'));

    const testRowsAfter = (await db.query(`SELECT id,title,is_test FROM public.campaign_events
      WHERE title ILIKE '%TEST%' AND venue ILIKE '%TEST%' ORDER BY title`)).rows;
    assert.deepEqual(testRowsAfter.map(row => row.id), testRowsBefore.map(row => row.id));
    assert.equal(testRowsAfter.length, 7);
    assert.ok(testRowsAfter.every(row => row.is_test === true), 'TEST-labeled legacy records are reclassified without replacing their IDs');
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_attendance')).rows[0].count, 49);
    assert.deepEqual((await db.query(`SELECT event_id,count(*)::int AS count
      FROM public.campaign_attendance GROUP BY event_id ORDER BY event_id`)).rows, testAttendanceBefore);

    const afterCredential = await credential(db, allApplication);
    for (const field of ['id', 'id_number', 'pass_slug', 'qr_token', 'issued_at', 'issued_by', 'valid_from', 'is_active', 'revoked_at', 'revoked_by']) {
      assert.deepEqual(afterCredential[field], beforeCredential[field], `existing credential ${field} remains unchanged`);
    }
    const afterApplication = (await db.query(`SELECT application_status,availability_mode,availability_match_ids
      FROM public.campaign_applications WHERE id=$1`, [allApplication.id])).rows[0];
    assert.deepEqual(afterApplication, beforeApplication, 'approval and workforce match scope remain unchanged');

    const official = (await db.query(`SELECT title,venue,is_active,is_test,
        to_char(start_date AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD HH24:MI:SS.MS') AS start_ist,
        to_char(end_date AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD HH24:MI:SS.MS') AS end_ist
      FROM public.campaign_events WHERE is_test=false AND title LIKE 'NUSC Home Match %' ORDER BY start_date`)).rows;
    assert.equal(official.length, 10);
    const dates = ['2026-11-14','2026-11-30','2026-12-15','2026-12-19','2027-01-04','2027-01-09','2027-01-16','2027-02-06','2027-03-13','2027-03-20'];
    for (const [index, row] of official.entries()) {
      assert.equal(row.title, `NUSC Home Match ${index + 1}`);
      assert.equal(row.venue, 'Chumukedima Football Stadium, Nagaland, India');
      assert.equal(row.is_active, true);
      assert.equal(row.is_test, false);
      assert.equal(row.start_ist, `${dates[index]} 00:00:00.000`);
      assert.equal(row.end_ist, `${dates[index]} 23:59:59.999`);
    }
    await db.exec(await campaignSql('20261106150000_seed_nusc_official_home_matches.sql'));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM public.campaign_events WHERE title LIKE 'NUSC Home Match %'")).rows[0].count, 10,
      'reapplying the seed cannot create duplicate official match rows');

    const issuer = (await db.query("SELECT pg_get_functiondef('public.issue_campaign_id(uuid,text,boolean)'::regprocedure) AS definition")).rows[0].definition;
    assert.match(issuer, /WHERE event\.id = v_app\.event_id AND event\.is_active AND NOT event\.is_test/i);
    assert.match(issuer, /WHERE event\.is_active AND NOT event\.is_test/i);
    assert.match(issuer, /IF FOUND AND NOT p_reissue THEN\s+UPDATE public\.campaign_ids\s+SET valid_until = GREATEST/i,
      'QR reuse keeps the production issuer branch');

    const publicVisibleByRole = new Map();
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        const visible = (await db.query('SELECT id,title,is_active,is_test FROM public.campaign_events')).rows;
        publicVisibleByRole.set(role, visible.map(row => row.id));
        assert.ok(visible.length > 0, `${role} retains public official event reads`);
        assert.ok(visible.every(row => row.is_active === true && row.is_test === false), `${role} cannot see inactive official or TEST matches`);
        assert.ok(!visible.some(row => row.id === eventByTitle['NUSC vs TEST TEAM 1'].id));
        assert.ok(!visible.some(row => row.id === eventByTitle['Inactive official match'].id));
      } finally { await db.exec('RESET ROLE'); }
    }
    assert.ok(publicVisibleByRole.get('anon').length > 0 && publicVisibleByRole.get('authenticated').length > 0);
    const legacyPolicy = (await db.query(`SELECT qual FROM pg_policies WHERE schemaname='public'
      AND tablename='campaign_events' AND policyname='campaign_test_events_not_public'`)).rows[0].qual;
    assert.match(legacyPolicy, /is_active/i);
    assert.match(legacyPolicy, /is_test/i);
    await db.exec('SET ROLE service_role');
    try {
      const adminEvents = await db.query('SELECT id,is_active,is_test FROM public.campaign_events');
      assert.ok(adminEvents.rows.some(row => row.is_test === true), 'authorized Admin/service access retains TEST visibility');
      assert.ok(adminEvents.rows.some(row => row.is_active === false && row.is_test === false), 'Admin/service access retains inactive official matches');
    } finally { await db.exec('RESET ROLE'); }

    const allAccessScans = [
      eventByTitle['Prod-equivalent official match A'],
      eventByTitle['Prod-equivalent official match B'],
      eventByTitle['NUSC vs TEST TEAM 1'],
    ];
    const originalToken = beforeCredential.qr_token;
    for (const match of allAccessScans) {
      assert.equal((await recordScan(db, originalToken, match.id, 'check_in')).code, 'CHECK_IN_SUCCESS');
      assert.equal((await recordScan(db, originalToken, match.id, 'check_out')).code, 'CHECK_OUT_SUCCESS');
    }
    assert.equal((await credential(db, allApplication)).qr_token, originalToken, 'one season credential QR works across independent match sessions');

    await db.query("UPDATE public.campaign_applications SET phone='9000000011',email='season-wide@example.invalid' WHERE id=$1", [allApplication.id]);
    const selectedApplication = await applicant(db, { status: 'approved' });
    await db.query(`UPDATE public.campaign_applications SET assigned_role_id=preferred_role_id,
        availability_mode='selected',availability_match_ids=ARRAY[$2::uuid]
      WHERE id=$1`, [selectedApplication.id, eventByTitle['Prod-equivalent official match A'].id]);
    await asServiceRole(db, () => db.query('SELECT public.issue_campaign_id($1,$2,false)', [selectedApplication.id, managerEmail]));
    const selectedCredential = await credential(db, selectedApplication);
    assert.equal((await recordScan(db, selectedCredential.qr_token, eventByTitle['Prod-equivalent official match A'].id, 'check_in')).code, 'CHECK_IN_SUCCESS');
    assert.equal((await recordScan(db, selectedCredential.qr_token, eventByTitle['Prod-equivalent official match B'].id, 'check_in')).code, 'WRONG_MATCH');
    assert.equal((await recordScan(db, selectedCredential.qr_token, eventByTitle['NUSC vs TEST TEAM 1'].id, 'check_in')).code, 'WRONG_MATCH');

    const originalPass = await credential(db, allApplication);
    await db.query(`UPDATE public.campaign_ids SET is_active=false,revoked_at=now(),revoked_by='synthetic revocation'
      WHERE id=$1`, [originalPass.id]);
    await asServiceRole(db, () => db.query('SELECT public.issue_campaign_id($1,$2,false)', [allApplication.id, managerEmail]));
    const stillRevoked = await credential(db, allApplication);
    assert.equal(stillRevoked.qr_token, originalPass.qr_token);
    assert.equal(stillRevoked.is_active, false);
    assert.ok(stillRevoked.revoked_at);
    await asServiceRole(db, () => db.query('SELECT public.issue_campaign_id($1,$2,true)', [allApplication.id, managerEmail]));
    const reissued = await credential(db, allApplication);
    assert.equal(reissued.id, originalPass.id);
    assert.equal(reissued.id_number, originalPass.id_number);
    assert.notEqual(reissued.qr_token, originalPass.qr_token);
    assert.notEqual(reissued.pass_slug, originalPass.pass_slug);
    assert.equal(reissued.is_active, true);
    assert.equal(reissued.revoked_at, null);

    const today = (await db.query("SELECT to_char(now() AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD') AS date")).rows[0].date;
    const testOne = await createTestEvent(db, 'TEST Rehearsal A', today);
    const testTwo = await createTestEvent(db, 'TEST Rehearsal B', today);
    assert.equal(testOne.success, true);
    const created = (await db.query(`SELECT id,title,is_test,
        to_char(start_date AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD HH24:MI:SS.MS') AS start_ist,
        to_char(end_date AT TIME ZONE 'Asia/Kolkata','YYYY-MM-DD HH24:MI:SS.MS') AS end_ist
      FROM public.campaign_events WHERE id=$1`, [testOne.id])).rows[0];
    assert.equal(created.is_test, true);
    assert.equal(created.start_ist, `${today} 00:00:00.000`);
    assert.equal(created.end_ist, `${today} 23:59:59.999`);

    const beforeDelete = (await db.query('SELECT count(*)::int AS count FROM public.campaign_attendance')).rows[0].count;
    for (const testMatch of [testOne, testTwo]) {
      await db.query(`INSERT INTO public.campaign_attendance(event_id,application_id,campaign_id,action,checkpoint_type,gate,scanned_by)
        VALUES($1,$2,$3,'duplicate_attempt','gate','Gate 1','synthetic-test-delete')`, [testMatch.id, allApplication.id, allCredential.id]);
    }
    const deleted = await asServiceRole(db, async () => (await db.query('SELECT public.delete_campaign_test_match($1) AS result', [testOne.id])).rows[0].result);
    assert.equal(deleted.success, true);
    assert.equal(deleted.deleted_attendance_count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_events WHERE id=$1', [testOne.id])).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_attendance WHERE event_id=$1', [testOne.id])).rows[0].count, 0);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_events WHERE id=$1 AND is_test=true', [testTwo.id])).rows[0].count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_attendance WHERE event_id=$1', [testTwo.id])).rows[0].count, 1);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM public.campaign_attendance')).rows[0].count, beforeDelete + 1);
    await assert.rejects(db.query('SELECT public.delete_campaign_test_match($1)', [official[0].title ? (await db.query("SELECT id FROM public.campaign_events WHERE title='NUSC Home Match 1'")).rows[0].id : null]), /Only an existing TEST match can be deleted/);
    await assert.rejects(db.query('UPDATE public.campaign_events SET is_test=false WHERE id=$1', [eventByTitle['NUSC vs TEST TEAM 1'].id]), /classification is immutable/);

    assert.equal((await db.query("SELECT has_function_privilege('anon','public.issue_campaign_id(uuid,text,boolean)','EXECUTE') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_function_privilege('service_role','public.issue_campaign_id(uuid,text,boolean)','EXECUTE') AS allowed")).rows[0].allowed, true);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.review_campaign_application(uuid,text,uuid,text)','EXECUTE') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_function_privilege('service_role','public.review_campaign_application(uuid,text,uuid,text)','EXECUTE') AS allowed")).rows[0].allowed, true);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.record_campaign_attendance_scan(text,text,text,text,uuid,text)','EXECUTE') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_function_privilege('service_role','public.record_campaign_attendance_scan(text,text,text,text,uuid,text)','EXECUTE') AS allowed")).rows[0].allowed, true);
    assert.equal((await db.query("SELECT has_function_privilege('anon','public.delete_campaign_test_match(uuid)','EXECUTE') AS allowed")).rows[0].allowed, false);
    assert.equal((await db.query("SELECT has_function_privilege('service_role','public.delete_campaign_test_match(uuid)','EXECUTE') AS allowed")).rows[0].allowed, true);
  } finally { await db.close(); }
});

