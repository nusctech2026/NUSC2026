import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

if (!process.argv.includes('--allow-database-writes') || !process.env.CAMPAIGN_DATABASE_URL) {
  throw new Error('Set CAMPAIGN_DATABASE_URL for the intended environment and pass --allow-database-writes.');
}
const client = new Client({ connectionString: process.env.CAMPAIGN_DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN');
  for (const name of ['20261027100000_create_campaign_tables.sql', '20261027110000_campaign_workflow_hardening.sql', '20261027120000_campaign_issue_crypto_search_path.sql']) {
    const sql = await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
    await client.query(sql);
  }
  await client.query('COMMIT');
  console.log('Campaign migrations committed.');
} catch {
  await client.query('ROLLBACK').catch(() => {});
  console.error('Campaign migration failed and was rolled back. Check the target database privately.');
  process.exitCode = 1;
} finally {
  await client.end();
}
