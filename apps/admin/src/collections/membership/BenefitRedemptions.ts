import { CollectionConfig } from 'payload'

export const BenefitRedemptions: CollectionConfig = {
  slug: 'benefit_redemptions',
  admin: {
    group: 'Membership',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'member',
      type: 'relationship',
      relationTo: 'members',
      required: true,
    },
    {
      name: 'benefit',
      type: 'relationship',
      relationTo: 'membership_benefits',
      required: true,
    },
    {
      name: 'redeemed_at',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
}
