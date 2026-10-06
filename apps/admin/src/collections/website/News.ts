import { CollectionConfig } from 'payload'
import { slugField } from '../../fields/slug'
import { seoFields } from '../../fields/seo'

export const News: CollectionConfig = {
  slug: 'news',
  labels: {
    singular: 'News Article',
    plural: 'News',
  },
  admin: {
    useAsTitle: 'title',
    group: 'Website Content',
  },
  versions: {
    drafts: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'publishDate',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'author',
      type: 'text',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'website-media',
    },
    {
      name: 'content',
      type: 'richText',
    },
    seoFields,
  ],
}
