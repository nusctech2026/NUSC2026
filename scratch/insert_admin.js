import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query("INSERT INTO user_roles (user_id, role) VALUES ('ae715e8b-8586-4239-8c76-037053704b5b', 'super_admin');");
    console.log("Success");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
