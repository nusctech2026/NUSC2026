import { getPayload } from 'payload'
import configPromise from './src/payload.config.js'

async function run() {
  try {
    const payload = await getPayload({ config: configPromise })
    console.log('Payload initialized')
    
    // Test creating an admin
    const result = await payload.create({
      collection: 'admins',
      data: {
        supabase_user_id: 'test-uuid-123',
        email: 'test@example.com',
        display_roles: [{ role: 'super_admin' }]
      }
    })
    console.log('Created admin:', result)
    
    // Clean up
    await payload.delete({
      collection: 'admins',
      id: result.id
    })
  } catch(e) {
    console.error('Error:', e)
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
