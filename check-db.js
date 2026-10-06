const { Client } = require('pg');

async function check() {
  const connectionString = 'postgresql://postgres:%25z.u9EWSfTP4q4%3F@db.ogsgayboeaewzsbcbojs.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query("SELECT * FROM information_schema.columns WHERE table_name='users' AND table_schema='public'");
    console.log("PUBLIC.USERS COLUMNS:", res.rows.map(r => r.column_name));
    
    // Also add the role column
    if (!res.rows.find(r => r.column_name === 'role')) {
        await client.query("ALTER TABLE public.users ADD COLUMN role VARCHAR DEFAULT 'super_admin'");
        console.log("Added role column to public.users");
        await client.query("UPDATE public.users SET role = 'super_admin' WHERE role IS NULL");
        console.log("Updated roles for existing public.users");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
check();
