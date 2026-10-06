import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ogsgayboeaewzsbcbojs.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nc2dheWJvZWFld3pzYmNib2pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTYyODE0MiwiZXhwIjoyMTA1MjA0MTQyfQ.uASmVzPAVE0ZsojA6VPFmDjlOznLL0oON4NHSYp_pdA'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  const email = 'admin@nusc.store'
  const password = 'Password123!'

  console.log(`Creating user ${email}...`)
  
  // 1. Create or update user
  const { data: user, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  let userId = user?.user?.id

  if (userError) {
    if (userError.message.includes('already been registered') || userError.message.includes('already exists')) {
      console.log('User already exists, updating password...')
      
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError
      const existingUser = users.find(u => u.email === email)
      userId = existingUser?.id

      if (userId) {
        await supabase.auth.admin.updateUserById(userId, { password })
      }
    } else {
      console.error('Error creating user:', userError)
      process.exit(1)
    }
  }

  if (!userId) {
    console.error('Could not determine user ID')
    process.exit(1)
  }

  // 2. Assign super_admin role
  console.log(`Assigning super_admin role to ${userId}...`)
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role: 'super_admin' }, { onConflict: 'user_id' })

  if (roleError) {
    console.error('Error assigning role:', roleError)
  } else {
    console.log(`Successfully created and configured ${email} with password: ${password}`)
  }
}

run()
