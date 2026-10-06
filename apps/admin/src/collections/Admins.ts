import type { CollectionConfig } from 'payload'
import { supabaseStrategy } from '../auth/supabaseStrategy'

export const Admins: CollectionConfig = {
  slug: 'admins',
  auth: {
    disableLocalStrategy: true,
    strategies: [supabaseStrategy],
  },
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'supabase_user_id',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'display_roles',
      type: 'array',
      admin: { readOnly: true },
      fields: [{ name: 'role', type: 'text' }],
    },
  ],
}
