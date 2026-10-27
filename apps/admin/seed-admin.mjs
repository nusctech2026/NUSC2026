import { createClient } from '@supabase/supabase-js'

if (!process.argv.includes('--allow-admin-seed')) {
  console.error('Refusing to seed an admin without the explicit --allow-admin-seed flag.')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.NUSC_BOOTSTRAP_ADMIN_EMAIL
const password = process.env.NUSC_BOOTSTRAP_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseServiceKey || !email || !password) {
  console.error('Missing required Supabase or bootstrap-admin environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  let userId = data?.user?.id
  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError
      userId = users.find(user => user.email === email)?.id
      if (userId) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, { password })
        if (updateError) throw updateError
      }
    } else {
      throw error
    }
  }

  if (!userId) throw new Error('Could not create or find the bootstrap admin user.')

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'super_admin' }, { onConflict: 'user_id' })
  if (roleError) throw roleError

  console.log('Admin bootstrap completed.')
}

run().catch(() => {
  console.error('Admin bootstrap failed. Check Supabase configuration and role-table constraints.')
  process.exitCode = 1
})
