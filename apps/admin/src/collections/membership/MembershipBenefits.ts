import { CollectionConfig } from 'payload'

export const MembershipBenefits: CollectionConfig = {
  slug: 'membership_benefits',
  admin: {
    useAsTitle: 'description',
    group: 'Membership',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'membership_plans',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Tickets', value: 'tickets' },
        { label: 'Discount', value: 'discount' },
        { label: 'Content', value: 'content' },
        { label: 'Events', value: 'events' },
        { label: 'Physical Goods', value: 'physical_goods' },
        { label: 'Other', value: 'other' },
      ],
      required: true,
    },
    {
      name: 'description',
      type: 'text',
      required: true,
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Machine readable rules (e.g., {"discount_percent": 10})',
      },
    },
    {
      name: 'is_active',
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
