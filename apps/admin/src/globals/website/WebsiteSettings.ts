import { GlobalConfig } from 'payload'
import { seoFields } from '../../fields/seo'

export const WebsiteSettings: GlobalConfig = {
  slug: 'website-settings',
  admin: {
    group: 'Website Settings',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'contactDetails',
      type: 'group',
      fields: [
        { name: 'email', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'Twitter/X', value: 'twitter' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'YouTube', value: 'youtube' },
          ],
        },
        { name: 'url', type: 'text' },
      ],
    },
    {
      name: 'branding',
      type: 'group',
      fields: [
        { name: 'logo', type: 'upload', relationTo: 'website-media' },
        { name: 'favicon', type: 'upload', relationTo: 'website-media' },
      ],
    },
    {
      ...seoFields,
      name: 'defaultSEO',
      label: 'Default SEO',
    },
  ],
}
