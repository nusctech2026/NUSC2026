import { CollectionConfig } from 'payload'

export const Members: CollectionConfig = {
  slug: 'members',
  admin: {
    useAsTitle: 'id',
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
      admin: {
        description: 'Supabase auth.user UUID',
      },
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'membership_plans',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Pending Payment', value: 'pending_payment' },
      ],
      defaultValue: 'active',
      required: true,
    },
    {
      name: 'start_date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'end_date',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'lead_member',
      type: 'relationship',
      relationTo: 'members',
    },
    {
      name: 'payment_id',
      type: 'text',
    },
  ],
}
