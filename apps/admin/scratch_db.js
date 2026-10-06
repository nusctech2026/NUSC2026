const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:%z.u9EWSfTP4q4?@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Create a dummy policy so Drizzle can successfully drop it
    await client.query(`
      CREATE POLICY "Public variants are viewable by everyone" ON "product_variants" FOR SELECT USING (true);
    `);
    console.log('Created dummy policy for Drizzle to drop.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
