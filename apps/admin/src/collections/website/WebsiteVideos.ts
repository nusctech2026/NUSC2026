import { CollectionConfig } from 'payload'

export const WebsiteVideos: CollectionConfig = {
  slug: 'website-videos',
  labels: {
    singular: 'Website Video',
    plural: 'Website Videos',
  },
  admin: {
    hidden: true,
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'filesize', 'updatedAt'],
    group: 'Website Settings',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    staticDir: 'media/website-videos',
    mimeTypes: ['video/mp4', 'video/webm'],
    focalPoint: false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
  ],
}
