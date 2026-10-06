import { CollectionConfig } from 'payload'

export const UserRoles: CollectionConfig = {
  slug: 'user_roles',
  admin: {
    hidden: true, // Hide from the admin sidebar
  },
  access: {
    read: () => true, // Allow Supabase API to read this
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: false,
  fields: [
    {
      name: 'user_id',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'role',
      type: 'text',
      required: true,
    },
  ],
}
