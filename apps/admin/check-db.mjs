import { Client } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env.local') })

const client = new Client({
  connectionString: process.env.DATABASE_URL
})

async function run() {
  await client.connect()
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'payload_locked_documents_rels';
  `)
  console.log(res.rows)
  await client.end()
}
run().catch(console.error)
