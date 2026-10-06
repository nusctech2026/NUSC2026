import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    await client.query(`ALTER TABLE "users" RENAME TO "admins";`);
    console.log('Renamed users to admins');
  } catch(e) { console.log(e.message) }
  
  try {
    await client.query(`ALTER TABLE "users_sessions" RENAME TO "admins_sessions";`);
    console.log('Renamed users_sessions to admins_sessions');
  } catch(e) { console.log(e.message) }

  try {
    await client.query(`ALTER TABLE "users_rels" RENAME TO "admins_rels";`);
  } catch(e) {}
  
  try {
    await client.query(`
      ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "supabase_user_id" varchar;
    `);
    console.log('Added supabase_user_id column');
  } catch(e) {
    console.log('Column add error:', e.message);
  }

  await client.end();
}

run().catch(console.error);
