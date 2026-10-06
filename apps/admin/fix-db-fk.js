import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  
  try {
    await client.query(`DROP TABLE IF EXISTS "admins_display_roles"`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS "admins_display_roles" (
        "_order" integer NOT NULL,
        "_parent_id" uuid NOT NULL,
        "id" varchar PRIMARY KEY NOT NULL,
        "role" varchar
      );
    `);
    
    await client.query(`
      ALTER TABLE "admins_display_roles" ADD CONSTRAINT "admins_display_roles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "admins"("id") ON DELETE cascade ON UPDATE no action;
    `);
    console.log('Recreated admins_display_roles with UUID and FK');
  } catch(e) { console.log(e.message) }

  await client.end();
}

run().catch(console.error);
