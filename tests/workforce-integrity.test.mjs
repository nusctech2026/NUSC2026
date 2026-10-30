import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignSql, workforceDatabase } from './fixtures/campaign-database.mjs';

async function insertLegacy(db, { number, phone, email, category = 'volunteer', roleCode = 'vol_security' }) {
  const role = (await db.query('SELECT id FROM campaign_roles WHERE code=$1', [roleCode])).rows[0];
  return (await db.query(`INSERT INTO campaign_applications(
    application_number,full_name,phone,email,category,preferred_role_id,availability
  ) VALUES($1,'Legacy Applicant',$2,$3,$4,$5,'Legacy availability') RETURNING *`,
  [number, phone, email, category, role?.id ?? null])).rows[0];
}

async function insertWorkforce(db, {
  category = 'crew', phone = '9000000001', email = 'new@example.invalid', roleCode = 'crew_others',
  idempotencyKey = crypto.randomUUID(), crewArrangement = 'independent',
} = {}) {
  const role = roleCode
    ? (await db.query('SELECT id FROM campaign_roles WHERE code=$1 AND is_active', [roleCode])).rows[0]
    : null;
  const effectiveCrewArrangement = category === 'crew' ? crewArrangement : null;
  const applicationNumber = `NUSC-${category.toUpperCase()}-${crypto.randomUUID()}`;
  return db.query(`INSERT INTO campaign_applications(
    application_number,full_name,phone,email,category,preferred_role_id,availability,availability_mode,
    availability_match_ids,terms_accepted_at,idempotency_key,idempotency_request_hash,
    crew_work_arrangement,crew_organisation,crew_lead_name,crew_lead_phone
  ) VALUES($1,'New Applicant',$2,$3,$4,$5,'Available for all matches','all','{}',now(),$6,$7,$8,
    CASE WHEN $8='organisation' THEN 'NUSC Crew Provider' END,
    CASE WHEN $8='organisation' THEN 'Crew Supervisor' END,
    CASE WHEN $8='organisation' THEN '9000000002' END)
  RETURNING *`, [applicationNumber, phone, email, category, role?.id ?? null, idempotencyKey, 'a'.repeat(64), effectiveCrewArrangement]);
}

test('workforce migration preserves legacy rows, seeds normalized claims, blocks duplicates and records redacted audit events', async () => {
  let legacyFirst;
  let legacySecond;
  const db = await workforceDatabase({ beforeIntegrity: async (database) => {
    legacyFirst = await insertLegacy(database, {
      number: 'LEGACY-WORKFORCE-1', phone: '9000000000', email: 'Candidate@Example.Invalid',
    });
    legacySecond = await insertLegacy(database, {
      number: 'LEGACY-WORKFORCE-2', phone: '+91 900-000-0000', email: 'candidate@example.invalid',
    });
  } });
  try {
    const rows = await db.query('SELECT id, potential_duplicate FROM campaign_applications ORDER BY application_number');
    assert.equal(rows.rows.length, 2);
    assert.equal(rows.rows[0].id, legacyFirst.id);
    assert.equal(rows.rows[1].id, legacySecond.id);
    assert.equal(rows.rows[1].potential_duplicate, true);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM workforce_registration_identity_claims')).rows[0].count, 2);

    await assert.rejects(insertWorkforce(db, { phone: '9000000000', email: 'different@example.invalid' }), /unique constraint/i);
    await assert.rejects(insertWorkforce(db, { phone: '9000000003', email: 'candidate@example.invalid' }), /unique constraint/i);

    const created = (await insertWorkforce(db)).rows[0];
    const audit = (await db.query(`SELECT changed_fields FROM campaign_application_change_history
      WHERE application_id=$1 ORDER BY changed_at`, [created.id])).rows[0].changed_fields;
    assert.equal(audit.event, 'registration_submitted');
    assert.equal(audit.department, 'crew');
    assert.equal('email' in audit, false);
    assert.equal('phone' in audit, false);

    const changedPhone = '9000000099';
    await db.query('UPDATE campaign_applications SET phone=$1 WHERE id=$2', [changedPhone, created.id]);
    const updateAudit = (await db.query(`SELECT changed_fields FROM campaign_application_change_history
      WHERE application_id=$1 ORDER BY changed_at DESC LIMIT 1`, [created.id])).rows[0].changed_fields;
    assert.deepEqual(updateAudit, { phone: true });
    const oldPhoneReused = (await insertWorkforce(db, {
      phone: '9000000001', email: 'reuse@example.invalid',
    })).rows[0];
    await assert.rejects(insertWorkforce(db, {
      phone: changedPhone, email: 'another@example.invalid',
    }), /unique constraint/i);

    await db.query('DELETE FROM campaign_applications WHERE id=$1', [created.id]);
    const reused = (await insertWorkforce(db, {
      phone: changedPhone, email: 'reuse-after-delete@example.invalid',
    })).rows[0];
    assert.equal(reused.phone, changedPhone);
    await db.query('DELETE FROM campaign_applications WHERE id=$1', [oldPhoneReused.id]);

    const migration = await campaignSql('20261028170000_workforce_registration_integrity.sql');
    await db.exec(migration);
    assert.equal((await db.query('SELECT count(*)::int AS count FROM campaign_applications')).rows[0].count, 3);
  } finally {
    await db.close();
  }
});

test('database validates new submission completeness, department roles, idempotency and supports departments with no active roles', async () => {
  const db = await workforceDatabase();
  try {
    await assert.rejects(insertWorkforce(db, { email: null }), /check constraint/i);
    await assert.rejects(insertWorkforce(db, { phone: 'not-a-phone' }), /check constraint/i);
    await assert.rejects(insertWorkforce(db, { roleCode: 'vol_security' }), /selected role is unavailable/i);

    const key = crypto.randomUUID();
    await insertWorkforce(db, { idempotencyKey: key });
    await assert.rejects(insertWorkforce(db, {
      idempotencyKey: key, phone: '9000000022', email: 'replay@example.invalid',
    }), /unique constraint/i);

    await db.query("UPDATE campaign_roles SET is_active=false WHERE category='volunteer'");
    const noRole = (await insertWorkforce(db, {
      category: 'volunteer', phone: '9000000033', email: 'no-role@example.invalid', roleCode: null,
    })).rows[0];
    assert.equal(noRole.preferred_role_id, null);
  } finally {
    await db.close();
  }
});

test('registration counters continue after existing workforce application numbers', async () => {
  const db = await workforceDatabase({ beforeIntegrity: async (database) => {
    await insertLegacy(database, {
      number: 'NUSC-CRW-009', phone: '9000000040', email: 'counter-legacy@example.invalid',
      category: 'crew', roleCode: 'crew_others',
    });
  } });
  try {
    const result = await db.query("SELECT public.next_workforce_registration_id('crew') AS id");
    assert.equal(result.rows[0].id, 'NUSC-CRW-010');
  } finally {
    await db.close();
  }
});
