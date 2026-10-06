import { CollectionConfig } from 'payload'

export const MembershipPlans: CollectionConfig = {
  slug: 'membership_plans',
  admin: {
    useAsTitle: 'name',
    group: 'Membership',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Price in minor units (e.g., paise). 300000 = ₹3,000.',
      },
    },
    {
      name: 'billing_cycle',
      type: 'select',
      options: [
        { label: 'Season', value: 'season' },
        { label: 'Annual', value: 'annual' },
        { label: 'Monthly', value: 'monthly' },
      ],
      defaultValue: 'season',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'is_purchasable_online',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
