import { CollectionConfig } from 'payload'
import { slugField } from '../../fields/slug'

export const Players: CollectionConfig = {
  slug: 'players',
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
      name: 'shirtNumber',
      type: 'number',
    },
    {
      name: 'position',
      type: 'text',
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      hasMany: false,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'website-media',
    },
    {
      name: 'bio',
      type: 'richText',
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
