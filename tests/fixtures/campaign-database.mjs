import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

export const campaignMigration = '20261027110000_campaign_workflow_hardening.sql';
export const campaignCryptoMigration = '20261027120000_campaign_issue_crypto_search_path.sql';
export const campaignSql = name => readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');

export async function campaignDatabase({ beforeHardening = async () => {} } = {}) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE SCHEMA extensions;
    CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY, name text, public boolean);
    -- PGlite has no pgcrypto; use random UUID bytes only for synthetic test defaults.
    CREATE FUNCTION gen_random_bytes(n int) RETURNS bytea LANGUAGE sql AS $$
      SELECT decode(substr(string_agg(replace(gen_random_uuid()::text, '-', ''), ''),1,n*2),'hex')
      FROM generate_series(1,(n+15)/16)
    $$;
    CREATE FUNCTION extensions.gen_random_bytes(n int) RETURNS bytea LANGUAGE sql AS $$
      SELECT decode(substr(string_agg(replace(gen_random_uuid()::text, '-', ''), ''),1,n*2),'hex')
      FROM generate_series(1,(n+15)/16)
    $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
  `);
  const store = await campaignSql('20260929132600_create_store_schema.sql');
  await db.exec(store.slice(0, store.indexOf('-- Categories Table')));
  await db.exec(await campaignSql('20261027100000_create_campaign_tables.sql'));
  await beforeHardening(db);
  await db.exec(await campaignSql(campaignMigration));
  await db.exec(await campaignSql(campaignCryptoMigration));
  return db;
}

export async function applicant(db, { status = 'submitted', category = 'volunteer', code = 'vol_security', eventId = null, otherRole = null } = {}) {
  const roleId = (await db.query('SELECT id FROM campaign_roles WHERE code=$1', [code])).rows[0].id;
  const values = [crypto.randomUUID(), category, roleId, status, eventId, otherRole];
  return (await db.query(`INSERT INTO campaign_applications(application_number,full_name,date_of_birth,gender,phone,email,address,
    category,preferred_role_id,application_status,event_id,other_role,availability,emergency_contact_name,emergency_contact_phone)
    VALUES ($1,'Synthetic Candidate','2000-01-01','Female','9000000000','candidate@example.invalid','Synthetic address',
    $2,$3,$4,$5,$6,'Matchdays','Synthetic Contact','9000000001') RETURNING *`, values)).rows[0];
}

export async function match(db, { active = true, offset = 0 } = {}) {
  return (await db.query(`INSERT INTO campaign_events(title,slug,venue,start_date,end_date,is_active)
    VALUES ('Synthetic match',$1,'Synthetic stadium',now()+($2-3600)*interval '1 second',now()+($2+3600)*interval '1 second',$3) RETURNING *`,
  [crypto.randomUUID(), offset, active])).rows[0];
}

export const review = async (db, app, status = 'approved') => (await db.query(
  'SELECT review_campaign_application($1,$2,$3,$4) result', [app.id, status, 'manager@example.invalid', 'Synthetic review'],
)).rows[0].result;

export const credential = async (db, app) => (await db.query('SELECT * FROM campaign_ids WHERE application_id=$1', [app.id])).rows[0];
export const scan = async (db, token, event, gate = 'Gate 1') => (await db.query(
  'SELECT verify_and_check_in_campaign_id($1,$2,$3,$4) result', [token, gate, 'gate@example.invalid', event?.id ?? null],
)).rows[0].result;
