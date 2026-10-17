import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applicant, campaignDatabase, campaignMigration, campaignSql, credential, match, review, scan } from './fixtures/campaign-database.mjs';

test('campaign offers the complete 8 Ahibi, 5 Volunteer and 5 Crew roles', async () => {
  const db = await campaignDatabase();
  try {
    const { rows } = await db.query('SELECT category,name FROM campaign_roles WHERE is_active');
    assert.deepEqual(rows.filter(row => row.category === 'ahibi').map(row => row.name).sort(), [
      'Ticketing','Gate 1 Scanning','Gate 3 Scanning','Gate 2 Security','Gate 2 Frisking','Supervisor','Tunnel Entry Team','VIP Entry Team',
    ].sort());
    assert.deepEqual(rows.filter(row => row.category === 'volunteer').map(row => row.name).sort(),
      ['Stretcher Boys','Perimeter Team','Security','Supervisors','Hospitality'].sort());
    assert.deepEqual(rows.filter(row => row.category === 'crew').map(row => row.name).sort(),
      ['Lights','LED','Sound','Technician','Others'].sort());
  } finally { await db.close(); }
});

test('approval issues exactly one ID and QR, assigns the selected role, and records the reviewer', async () => {
  const db = await campaignDatabase();
  try {
    for (const options of [{}, { category:'ahibi', code:'ahibi_gate_3_scanning' }, { category:'crew', code:'crew_others', otherRole:'Camera operator' }]) {
      const app = await applicant(db, options);
      assert.equal(await credential(db, app), undefined);
      await review(db, app); const id = await credential(db, app);
      assert.match(id.id_number, /^NUSC-ID-\d{4}-[A-F0-9]{16}$/);
      assert.equal(id.qr_token.length, 64); assert.equal(id.pass_slug.length, 32);
      assert.notEqual(id.qr_token, id.pass_slug);
      await review(db, app);
      assert.equal((await credential(db, app)).qr_token, id.qr_token);
      const current = (await db.query('SELECT * FROM campaign_applications WHERE id=$1', [app.id])).rows[0];
      assert.equal(current.assigned_role_id, app.preferred_role_id);
      assert.equal(current.reviewed_by, 'manager@example.invalid');
    }
    assert.equal((await db.query('SELECT count(*)::int n FROM campaign_ids')).rows[0].n, 3);
  } finally { await db.close(); }
});

test('approval and ID creation roll back together when the preferred role is inactive', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db);
    await db.query('UPDATE campaign_roles SET is_active=false WHERE id=$1', [app.preferred_role_id]);
    await assert.rejects(review(db, app), /active role/);
    assert.equal((await db.query('SELECT application_status FROM campaign_applications WHERE id=$1', [app.id])).rows[0].application_status, 'submitted');
    assert.equal(await credential(db, app), undefined);
  } finally { await db.close(); }
});

test('one campaign credential records attendance separately for two matches and blocks duplicate scans', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db); await review(db, app);
    const id = await credential(db, app), first = await match(db), second = await match(db);
    assert.equal((await scan(db, id.qr_token, first)).code, 'CHECK_IN_SUCCESS');
    assert.equal((await scan(db, id.qr_token, first, 'Gate 3')).code, 'ALREADY_CHECKED_IN');
    assert.equal((await scan(db, id.qr_token, second)).code, 'CHECK_IN_SUCCESS');
    const logs = (await db.query('SELECT event_id,action,gate,scanned_by FROM campaign_attendance ORDER BY scanned_at')).rows;
    assert.deepEqual(logs.map(row => row.action), ['check_in','duplicate_attempt','check_in']);
    assert.deepEqual(logs.map(row => row.event_id), [first.id,first.id,second.id]);
    assert.equal(logs[1].gate, 'Gate 3'); assert.equal(logs[0].scanned_by, 'gate@example.invalid');
  } finally { await db.close(); }
});

test('specified Crew role is available in the gate verification result', async () => {
  const db = await campaignDatabase();
  try {
    const app = await applicant(db, { category:'crew',code:'crew_others',otherRole:'Camera operator' });
    await review(db, app);
    const result = await scan(db, (await credential(db, app)).qr_token, await match(db));
    assert.equal(result.candidate.assigned_role, 'Others: Camera operator');
  } finally { await db.close(); }
});

test('hardening is repeatable and retains existing applications and legacy attendance', async () => {
  let legacyApp, legacyId;
  const db = await campaignDatabase({ beforeHardening: async database => {
    legacyApp = await applicant(database, { status:'approved' });
    legacyId = (await database.query(`INSERT INTO campaign_ids(application_id,id_number,issued_by,valid_until)
      VALUES($1,'LEGACY-ID','legacy',now()+interval '1 day') RETURNING *`, [legacyApp.id])).rows[0];
    await database.query(`INSERT INTO campaign_attendance(application_id,campaign_id,gate,scanned_by) VALUES($1,$2,'Old Gate','legacy')`, [legacyApp.id,legacyId.id]);
  } });
  try {
    await db.exec(await campaignSql(campaignMigration));
    assert.equal((await credential(db, legacyApp)).qr_token, legacyId.qr_token);
    const logs = (await db.query('SELECT * FROM campaign_attendance')).rows;
    assert.equal(logs.length, 1); assert.equal(logs[0].event_id, null);
    assert.equal((await db.query('SELECT count(*)::int n FROM campaign_roles')).rows[0].n, 18);
  } finally { await db.close(); }
});
