import type { CollectionConfig } from 'payload'

export const MatchBenefits: CollectionConfig = {
  slug: 'match_benefits',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      // In Postgres adapter, the foreign key column will default to "match_id" based on relationship configuration
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'pointsCost',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      options: [
        { label: 'Percentage', value: 'percentage' },
        { label: 'Fixed Amount', value: 'fixed' },
      ],
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'claimStart',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'claimEnd',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'maxRedemptionsPerMember',
      type: 'number',
      defaultValue: 1,
      min: 1,
      required: true,
    },
  ],
}
