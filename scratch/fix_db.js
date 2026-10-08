import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`ALTER TABLE trial_registrations ADD COLUMN player_position varchar;`);
    console.log("Success: Added player_position column.");
  } catch (err) {
    if (err.code === '42701') {
      console.log("Column already exists.");
    } else {
      console.error("Error:", err.message);
    }
  } finally {
    await client.end();
  }
}

run();
