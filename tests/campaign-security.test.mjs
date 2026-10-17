import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicant, campaignDatabase, credential, match, review, scan } from './fixtures/campaign-database.mjs';

test('anonymous and authenticated clients cannot read private campaign data or invoke privileged functions', async () => {
  const db = await campaignDatabase();
  try {
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of ['campaign_applications','campaign_ids','campaign_attendance','campaign_rate_limits']) {
        await assert.rejects(db.query(`SELECT * FROM ${table}`), /permission denied/);
        await assert.rejects(db.query(`DELETE FROM ${table}`), /permission denied/);
      }
      await assert.rejects(db.query(`SELECT verify_and_check_in_campaign_id('token','Gate 1','forged',null)`), /permission denied/);
      await assert.rejects(db.query(`SELECT review_campaign_application(null,'approved','forged',null)`), /permission denied/);
      await assert.rejects(db.query(`SELECT issue_campaign_id(null,'forged',true)`), /permission denied/);
      await assert.rejects(db.query(`SELECT consume_campaign_rate_limit('forged',100,1)`), /permission denied/);
      assert.equal((await db.query('SELECT count(*)::int n FROM campaign_roles')).rows[0].n, 18);
      await db.exec('RESET ROLE');
    }
  } finally { await db.exec('RESET ROLE'); await db.close(); }
});

test('invalid, expired, future, revoked and unapproved credentials cannot create attendance', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db), event = await match(db);
    await assert.rejects(db.query('SELECT issue_campaign_id($1,$2)', [app.id,'staff']), /approved first/);
    await review(db, app); const id = await credential(db, app);
    assert.equal((await scan(db, 'forged', event)).code, 'INVALID_TOKEN');
    await db.query("UPDATE campaign_ids SET valid_until=now()-interval '1 second'");
    assert.equal((await scan(db, id.qr_token, event)).code, 'EXPIRED');
    await db.query("UPDATE campaign_ids SET valid_until=now()+interval '1 day',valid_from=now()+interval '1 hour'");
    assert.equal((await scan(db, id.qr_token, event)).code, 'NOT_YET_VALID');
    await db.query("UPDATE campaign_ids SET valid_from=now()-interval '1 day',revoked_at=now()");
    assert.equal((await scan(db, id.qr_token, event)).code, 'REVOKED');
    await db.query('UPDATE campaign_ids SET revoked_at=null');
    await review(db, app, 'rejected');
    assert.equal((await scan(db, id.qr_token, event)).code, 'NOT_APPROVED');
    assert.equal((await db.query('SELECT count(*)::int n FROM campaign_attendance')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('match substitution, missing match, closed match, inactive match and invalid gate are denied', async () => {
  const db = await campaignDatabase();
  try {
    const correct = await match(db), wrong = await match(db), closed = await match(db, { offset:-86400 });
    const inactive = await match(db, { active:false });
    const app = await applicant(db, { eventId:correct.id }); await review(db, app);
    const id = await credential(db, app);
    assert.equal((await scan(db, id.qr_token, null)).code, 'MATCH_REQUIRED');
    assert.equal((await scan(db, id.qr_token, wrong)).code, 'WRONG_MATCH');
    assert.equal((await scan(db, id.qr_token, inactive)).code, 'INVALID_MATCH');
    assert.equal((await scan(db, id.qr_token, correct, 'Forged gate')).code, 'INVALID_GATE');
    await db.query('UPDATE campaign_applications SET event_id=null WHERE id=$1', [app.id]);
    assert.equal((await scan(db, id.qr_token, closed)).code, 'MATCH_CLOSED');
    assert.equal((await scan(db, id.qr_token, await match(db, { offset:86400 }))).code, 'MATCH_CLOSED');
    assert.equal((await db.query('SELECT count(*)::int n FROM campaign_attendance')).rows[0].n, 0);
  } finally { await db.close(); }
});

test('database uniqueness prevents double check-in and new check-ins require a match', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db), event = await match(db); await review(db, app);
    const id = await credential(db, app);
    // PGlite serialises queries. Uniqueness is checked independently of RPC locking.
    const results = await Promise.all(Array.from({ length:5 }, () => scan(db, id.qr_token, event)));
    assert.equal(results.filter(result => result.success).length, 1);
    await assert.rejects(db.query(`INSERT INTO campaign_attendance(event_id,application_id,campaign_id,gate,scanned_by)
      VALUES($1,$2,$3,'Gate 1','test')`, [event.id,app.id,id.id]), /unique constraint/);
    await assert.rejects(db.query(`INSERT INTO campaign_attendance(application_id,campaign_id,gate,scanned_by)
      VALUES($1,$2,'Gate 1','test')`, [app.id,id.id]), /campaign_checkin_requires_match/);
  } finally { await db.close(); }
});

test('approval never silently reactivates a revoked ID; explicit reissue invalidates old QR and pass link', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db); await review(db, app);
    const original = await credential(db, app), event = await match(db);
    await db.query('UPDATE campaign_ids SET is_active=false,revoked_at=now()');
    await review(db, app);
    assert.equal((await scan(db, original.qr_token, event)).code, 'REVOKED');
    await db.query('SELECT issue_campaign_id($1,$2,true)', [app.id,'manager@example.invalid']);
    const replacement = await credential(db, app);
    assert.equal(replacement.id_number, original.id_number);
    assert.notEqual(replacement.qr_token, original.qr_token); assert.notEqual(replacement.pass_slug, original.pass_slug);
    assert.equal((await scan(db, original.qr_token, event)).code, 'INVALID_TOKEN');
    assert.equal((await db.query('SELECT id FROM campaign_ids WHERE pass_slug=$1', [original.pass_slug])).rows.length, 0);
    assert.equal((await scan(db, replacement.qr_token, event)).code, 'CHECK_IN_SUCCESS');
  } finally { await db.close(); }
});

test('persistent rate limits stop excess attempts and reset only after the database window elapses', async () => {
  const db = await campaignDatabase();
  try {
    const attempt = async () => (await db.query("SELECT consume_campaign_rate_limit('synthetic-hash',3,900) allowed")).rows[0].allowed;
    assert.deepEqual(await Promise.all([attempt(),attempt(),attempt(),attempt(),attempt()]), [true,true,true,false,false]);
    await db.query("UPDATE campaign_rate_limits SET window_start=now()-interval '901 seconds'");
    assert.equal(await attempt(), true);
  } finally { await db.close(); }
});
