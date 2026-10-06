import { CollectionConfig } from 'payload'

export const WebsiteMedia: CollectionConfig = {
  slug: 'website-media',
  admin: {
    useAsTitle: 'alt',
    group: 'Website Settings',
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: 'media/website',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 512,
        position: 'centre',
      },
      {
        name: 'hero',
        width: 1920,
        height: 1080,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
}
