import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  accreditationDatabase, applicant, credential, match, scan,
} from './fixtures/campaign-database.mjs';

const managerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reviewerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function review(db, applicationId, status, actorId) {
  return db.query('SELECT public.review_campaign_application($1,$2,$3,$4) result',
    [applicationId, status, actorId, 'Synthetic review']);
}

test('legacy Press applicant records and attendance history survive while public access is blocked', async () => {
  let application;
  let credentialId;
  let legacyEvent;
  const db = await accreditationDatabase({ beforeReliability: async database => {
    await database.query("INSERT INTO press_accreditations(applicant_name) VALUES ('Legacy Press Candidate')");
    await database.query("INSERT INTO storage.buckets(id,name,public) VALUES ('press_documents','Legacy press documents',true)");
    await database.query("INSERT INTO storage.objects(bucket_id,name) VALUES ('press_documents','legacy/id-card.png'),('campaign_documents','pass/photo.png')");
    legacyEvent = await match(database);
    application = await applicant(database, { status: 'approved', category: 'crew', code: 'crew_others', otherRole: 'Camera operator' });
    await database.query('UPDATE campaign_applications SET assigned_role_id=preferred_role_id WHERE id=$1', [application.id]);
    credentialId = (await database.query(`INSERT INTO campaign_ids(application_id,id_number,issued_by,valid_until)
      VALUES($1,'LEGACY-ID','legacy',now()+interval '1 day') RETURNING id`, [application.id])).rows[0].id;
    await database.query(`INSERT INTO campaign_attendance(event_id,application_id,campaign_id,gate,scanned_by)
      VALUES($1,$2,$3,'Gate 1','legacy')`, [legacyEvent.id, application.id, credentialId]);
  } });

  try {
    assert.equal((await db.query('SELECT count(*)::int AS count FROM press_accreditations')).rows[0].count, 1);
    assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='press_documents'")).rows[0].public, false);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM campaign_attendance WHERE campaign_id=$1', [credentialId])).rows[0].count, 1);
    await assert.rejects(db.query('DELETE FROM campaign_applications WHERE id=$1', [application.id]), /foreign key/i);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM campaign_attendance WHERE campaign_id=$1', [credentialId])).rows[0].count, 1);

    await db.exec('SET ROLE anon');
    try {
      await assert.rejects(db.query('SELECT * FROM press_accreditations'), /permission denied/i);
      assert.equal((await db.query("SELECT count(*)::int AS count FROM storage.objects WHERE bucket_id='press_documents'")).rows[0].count, 0);
      await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('press_documents','new/private.png')"), /row-level security/i);
    } finally { await db.exec('RESET ROLE'); }

    await db.exec('SET ROLE authenticated');
    try {
      await assert.rejects(db.query('SELECT * FROM press_accreditations'), /permission denied/i);
      assert.equal((await db.query("SELECT count(*)::int AS count FROM storage.objects WHERE bucket_id='press_documents'")).rows[0].count, 0);
    } finally { await db.exec('RESET ROLE'); }

    await db.exec('SET ROLE service_role');
    try {
      assert.equal((await db.query('SELECT count(*)::int AS count FROM press_accreditations')).rows[0].count, 1);
    } finally { await db.exec('RESET ROLE'); }
  } finally { await db.close(); }
});

test('reviewer privileges are enforced by the database and approved records cannot be downgraded', async () => {
  const db = await accreditationDatabase();
  try {
    const app = await applicant(db);
    await assert.rejects(review(db, app.id, 'approved', reviewerId), /Reviewers cannot make this application status change/);
    await review(db, app.id, 'under_review', reviewerId);
    await review(db, app.id, 'approved', managerId);
    const id = await credential(db, app);

    for (const status of ['submitted', 'under_review', 'waitlisted', 'rejected', 'cancelled']) {
      await assert.rejects(review(db, app.id, status, reviewerId), /Reviewers cannot make this application status change/);
    }
    assert.equal((await db.query('SELECT application_status FROM campaign_applications WHERE id=$1', [app.id])).rows[0].application_status, 'approved');
    assert.equal((await credential(db, app)).qr_token, id.qr_token);

    await db.exec('SET ROLE anon');
    try {
      await assert.rejects(review(db, app.id, 'rejected', reviewerId), /permission denied/i);
    } finally { await db.exec('RESET ROLE'); }
  } finally { await db.close(); }
});

test('one credential spans ten match days with independent per-match check-in and check-out records', async () => {
  const db = await accreditationDatabase();
  try {
    const app = await applicant(db);
    const events = [];
    for (let day = 0; day < 9; day += 1) events.push(await match(db));
    events.push(await match(db, { offset: 120 * 24 * 60 * 60 }));
    await review(db, app.id, 'approved', managerId);
    const issued = await credential(db, app);
    assert.ok(new Date(issued.valid_until) >= new Date(events[9].end_date));
    const originalToken = issued.qr_token;

    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      if (index === events.length - 1) {
        await db.query(`UPDATE campaign_events SET start_date=now()-interval '1 hour', end_date=now()+interval '1 hour'
          WHERE id=$1`, [event.id]);
      }
      assert.equal((await scan(db, originalToken, event, 'Gate 1')).code, 'CHECK_IN_SUCCESS');
      await db.query(`INSERT INTO campaign_attendance(event_id,application_id,campaign_id,action,gate,scanned_by)
        VALUES($1,$2,$3,'check_out',$4,'exit-staff')`, [event.id, app.id, issued.id, `Exit ${index + 1}`]);
    }

    assert.equal((await scan(db, originalToken, events[0], 'Gate 3')).code, 'ALREADY_CHECKED_IN');
    assert.equal((await credential(db, app)).qr_token, originalToken);
    const logs = (await db.query(`SELECT event_id,action FROM campaign_attendance
      WHERE application_id=$1 ORDER BY action,event_id`, [app.id])).rows;
    assert.equal(logs.filter(row => row.action === 'check_in').length, 10);
    assert.equal(logs.filter(row => row.action === 'check_out').length, 10);
    assert.equal(logs.filter(row => row.action === 'duplicate_attempt').length, 1);
    assert.equal(new Set(logs.filter(row => row.action === 'check_in').map(row => row.event_id)).size, 10);
    assert.equal(new Set(logs.filter(row => row.action === 'check_out').map(row => row.event_id)).size, 10);
  } finally { await db.close(); }
});

test('Other and Match Official labels change without changing saved role identifiers', async () => {
  let savedRoleIds;
  let savedApplication;
  const db = await accreditationDatabase({ beforeReliability: async database => {
    savedRoleIds = (await database.query(`SELECT id,code FROM campaign_roles
      WHERE right(code,7)='_others' OR code='official_match_commissioner' ORDER BY code`)).rows;
    savedApplication = await applicant(database, { category: 'officials', code: 'official_match_commissioner' });
  } });

  try {
    const roles = (await db.query(`SELECT id,name,code FROM campaign_roles
      WHERE right(code,7)='_others' OR code='official_match_commissioner' ORDER BY code`)).rows;
    assert.deepEqual(roles.map(role => [role.id, role.code]), savedRoleIds.map(role => [role.id, role.code]));
    assert.ok(roles.filter(role => role.code.endsWith('_others')).every(role => role.name === 'Other'));
    assert.equal(roles.find(role => role.code === 'official_match_commissioner').name, 'Match Official');
    assert.equal((await db.query('SELECT preferred_role_id FROM campaign_applications WHERE id=$1', [savedApplication.id])).rows[0].preferred_role_id,
      roles.find(role => role.code === 'official_match_commissioner').id);
    const transformed = (await db.query(`SELECT public.record_campaign_attendance_scan('', '', '', '', NULL, '') AS result`)).rows[0].result;
    assert.equal(transformed.role, 'Other: Camera operator');
    const categories = (await db.query('SELECT DISTINCT category FROM campaign_roles WHERE is_active ORDER BY category')).rows.map(row => row.category);
    assert.deepEqual(categories, ['ahibi', 'crew', 'management', 'media', 'medical', 'officials', 'volunteer']);
    const prefixes = { ahibi: 'AHB', volunteer: 'VOL', media: 'MED', crew: 'CRW', management: 'MGT', officials: 'OFC', medical: 'HLT' };
    const registrationIds = [];
    for (const [category, prefix] of Object.entries(prefixes)) {
      const id = (await db.query('SELECT public.next_workforce_registration_id($1) AS id', [category])).rows[0].id;
      assert.match(id, new RegExp(`^NUSC-${prefix}-\\d{3,}$`));
      registrationIds.push(id);
    }
    assert.equal(new Set(registrationIds).size, 7);
  } finally { await db.close(); }
});
