const pg = require('pg');
const { Client } = pg;

async function run() {
  const client = new Client({
    user: 'postgres',
    password: '%z.u9EWSfTP4q4?',
    host: 'db.ogsgayboeaewzsbcbojs.supabase.co',
    port: 5432,
    database: 'postgres'
  });

  try {
    await client.connect();
    
    // Create table exactly matching Payload's schema expectations
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id uuid primary key default gen_random_uuid(),
        user_id varchar not null,
        role varchar not null
      );
    `);
    
    // Create an index on user_id as specified in our UserRoles.ts
    await client.query(`CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON public.user_roles (user_id);`);

    // Grant permissions
    await client.query(`GRANT ALL ON public.user_roles TO anon, authenticated, service_role;`);
    
    // Enable RLS
    await client.query(`
      ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Public user_roles" ON public.user_roles;
      CREATE POLICY "Public user_roles" ON public.user_roles FOR SELECT USING (true);
    `);

    // Insert user
    const userRes = await client.query(`SELECT id FROM auth.users WHERE email = 'admin@nusc.store' LIMIT 1;`);
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      // Insert
      await client.query(`INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'super_admin')`, [userId]);
      console.log('Inserted super_admin successfully!');
    }
    
    // Reload schema
    await client.query(`NOTIFY pgrst, 'reload schema';`);

  } catch (e) {
    console.log(e);
  } finally {
    await client.end();
  }
}

run();
