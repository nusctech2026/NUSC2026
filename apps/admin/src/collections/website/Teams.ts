import { CollectionConfig } from 'payload'
import { slugField } from '../../fields/slug'

export const Teams: CollectionConfig = {
  slug: 'teams',
  admin: {
    useAsTitle: 'name',
    group: 'Website Content',
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
    slugField('name'),
    {
      name: 'ageGroup',
      type: 'text',
    },
    {
      name: 'coach',
      type: 'text',
    },
    {
      name: 'season',
      type: 'text',
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'website-media',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Archived', value: 'archived' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
