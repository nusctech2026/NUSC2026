import { CollectionConfig } from 'payload'

export const MemberProfiles: CollectionConfig = {
  slug: 'member_profiles',
  admin: {
    useAsTitle: 'first_name',
    group: 'Membership',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'user_id',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Supabase auth.user UUID',
      },
    },
    {
      name: 'first_name',
      type: 'text',
      required: true,
    },
    {
      name: 'last_name',
      type: 'text',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
    },
    {
      name: 'address',
      type: 'text',
    },
    {
      name: 'date_of_birth',
      type: 'date',
    },
  ],
}
