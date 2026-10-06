import { GroupField } from 'payload'

export const seoFields: GroupField = {
  name: 'seo',
  label: 'SEO',
  type: 'group',
  admin: {
    position: 'sidebar',
  },
  fields: [
    {
      name: 'title',
      label: 'SEO Title',
      type: 'text',
      admin: {
        description: 'Optimized title for search engines. Leave blank to fallback to the default title.',
      },
    },
    {
      name: 'description',
      label: 'Meta Description',
      type: 'textarea',
      admin: {
        description: 'Recommended length is 150-160 characters.',
      },
    },
    {
      name: 'ogImage',
      label: 'Open Graph Image',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'Image displayed when shared on social networks.',
      },
    },
  ],
}
