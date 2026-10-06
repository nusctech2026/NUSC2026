import { GlobalConfig, Field } from 'payload'

const linkFields: Field[] = [
  {
    name: 'type',
    type: 'radio',
    options: [
      { label: 'Page Reference', value: 'reference' },
      { label: 'Custom URL', value: 'custom' },
    ],
    defaultValue: 'reference',
  },
  {
    name: 'reference',
    type: 'relationship',
    relationTo: 'pages',
    admin: {
      condition: (_, siblingData) => siblingData?.type === 'reference',
    },
  },
  {
    name: 'url',
    type: 'text',
    admin: {
      condition: (_, siblingData) => siblingData?.type === 'custom',
    },
  },
  {
    name: 'label',
    type: 'text',
    required: true,
  },
  {
    name: 'newTab',
    type: 'checkbox',
  },
]

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: {
    group: 'Website Settings',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'header',
      type: 'array',
      fields: linkFields,
    },
    {
      name: 'footer',
      type: 'array',
      fields: linkFields,
    },
    {
      name: 'externalLinks',
      type: 'array',
      fields: linkFields,
    },
  ],
}
