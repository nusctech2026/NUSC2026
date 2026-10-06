import { CollectionConfig } from 'payload'
import { slugField } from '../../fields/slug'
import { seoFields } from '../../fields/seo'
import { ContentBlock, HeroBlock } from '../../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
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
      name: 'layout',
      type: 'blocks',
      blocks: [HeroBlock, ContentBlock],
    },
    seoFields,
  ],
}
