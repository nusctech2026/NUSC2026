import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';

async function restore() {
  const client = new Client({ connectionString });
  await client.connect();

  const files = [
    'supabase/migrations/20260929132600_create_store_schema.sql',
    'supabase/migrations/20260930114800_add_is_featured_to_products.sql',
    'supabase/migrations/20260930115800_add_upload_fields_to_product_images.sql'
  ];

  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    // Basic split by semicolon. Not perfect for all SQL but good enough for these files.
    // Let's use a regex that splits by semicolon followed by a newline or end of string.
    const statements = sql.split(/;\s*$/m).filter(s => s.trim() !== '');

    for (const stmt of statements) {
      try {
        await client.query(stmt + ';');
      } catch (err) {
        // ignore already exists or does not exist errors
        if (err.code === '42710' || err.code === '42P07' || err.code === '42704' || err.code === '42701') {
          // ignore
        } else {
          console.error(`Error on statement:\n${stmt}\nError: ${err.message}`);
        }
      }
    }
  }

  console.log('Restoration complete');
  await client.end();
}

restore().catch(console.error);
