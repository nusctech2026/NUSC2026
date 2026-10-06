import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env.local') })

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

async function run() {
  await client.connect()
  try {
    await client.query(`
      ALTER TABLE payload_preferences_rels ADD COLUMN IF NOT EXISTS admins_id uuid;
      ALTER TABLE payload_preferences_rels ADD CONSTRAINT fk_admins_id FOREIGN KEY (admins_id) REFERENCES admins(id) ON DELETE CASCADE;
    `)
    console.log("Successfully added admins_id column")
  } catch (e) {
    console.error(e)
  }
  await client.end()
}
run()
