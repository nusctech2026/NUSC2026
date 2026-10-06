import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const sql = fs.readFileSync('supabase/migrations/20261006120000_create_membership_schema.sql', 'utf8');
    await client.query(sql);
    console.log("Success");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
