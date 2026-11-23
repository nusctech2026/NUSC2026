import { GlobalConfig } from 'payload'
import { seoFields } from '../../fields/seo'

function validateInstagramMediaUrl(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) {
    return 'Enter the full Instagram post or Reel URL.'
  }

  try {
    const url = new URL(value.trim())
    const isInstagramHost = ['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase())
    const isMediaPath = /^\/(p|reel|tv)\/[^/]+\/?$/i.test(url.pathname)

    return url.protocol === 'https:' && isInstagramHost && isMediaPath
      ? true
      : 'Use a secure Instagram post or Reel URL.'
  } catch {
    return 'Enter a valid Instagram post or Reel URL.'
  }
}

function parseYouTubeVideoId(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:') return null

    const hostname = url.hostname.toLowerCase()
    const isYouTubeHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname)
    let videoId: string | null = null

    if (hostname === 'youtu.be') {
      videoId = url.pathname.match(/^\/([^/]+)\/?$/)?.[1] ?? null
    } else if (isYouTubeHost) {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v')
      } else {
        videoId = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/i)?.[1] ?? null
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null
  } catch {
    return null
  }
}

function validateYouTubeVideoUrl(value: unknown): true | string {
  return parseYouTubeVideoId(value)
    ? true
    : 'Use a valid HTTPS YouTube watch, Shorts, or youtu.be link.'
}

function instagramMediaFields(kind: 'post' | 'reel') {
  return [
    {
      name: 'title',
      label: 'Display Title',
      type: 'text' as const,
      required: true,
    },
    ...(kind === 'reel' ? [{
      name: 'video',
      label: 'Reel Video (MP4 or WebM)',
      type: 'upload' as const,
      relationTo: 'website-videos' as const,
      filterOptions: {
        mimeType: { contains: 'video' },
      },
      admin: {
        description: 'Upload the Reel video here to autoplay it inline on the homepage. The video starts muted; visitors can pause or play it.',
      },
    }] : []),
    ...(kind === 'post' ? [{
      name: 'format',
      label: 'Post Format',
      type: 'select' as const,
      required: true,
      defaultValue: 'photo' as const,
      options: [
        { label: 'Photo', value: 'photo' },
        { label: 'Carousel', value: 'carousel' },
      ],
      admin: {
        description: 'Choose Carousel when the Instagram post contains multiple slides.',
      },
    }] : []),
    {
      name: 'thumbnail',
      label: kind === 'post' ? 'Thumbnail Image (Optional)' : 'Thumbnail Image',
      type: 'upload' as const,
      relationTo: 'website-media' as const,
      required: kind === 'reel',
      filterOptions: {
        mimeType: { contains: 'image' },
      },
      ...(kind === 'post' ? {
        admin: {
          description: 'Optional. Leave this blank to embed the public Instagram post directly on the homepage.',
        },
      } : {}),
    },
    {
      name: 'altText',
      label: 'Image Alt Text',
      type: 'text' as const,
      admin: {
        description: 'Optional; overrides the uploaded thumbnail alt text.',
      },
    },
    {
      name: 'instagramUrl',
      label: `Instagram ${kind} URL`,
      type: 'text' as const,
      required: true,
      validate: validateInstagramMediaUrl,
      ...(kind === 'post' ? {
        admin: {
          description: 'Use a public post URL. When no thumbnail is uploaded, the homepage displays Instagram’s embed.',
        },
      } : {}),
    },
    {
      name: 'showOnHomepage',
      label: 'Show on Homepage',
      type: 'checkbox' as const,
      defaultValue: true,
    },
  ]
}

export const WebsiteSettings: GlobalConfig = {
  slug: 'website-settings',
  lockDocuments: false,
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
      name: 'homePageHeroSlides',
      label: 'Homepage Hero Carousel',
      type: 'array',
      admin: {
        description: 'Add at least two slides for carousel navigation and automatic rotation. Reorder slides here; the fallback image below is used when this list is empty.',
      },
      fields: [
        {
          name: 'image',
          label: 'Slide Image',
          type: 'upload',
          relationTo: 'website-media',
          required: true,
        },
        {
          name: 'alt',
          label: 'Alt Text Override',
          type: 'text',
          admin: {
            description: 'Optional; uses the media item alt text when blank.',
          },
        },
      ],
    },
    {
      name: 'homePageHeroImage',
      label: 'Fallback Homepage Hero Image',
      type: 'upload',
      relationTo: 'website-media',
      admin: {
        description: 'Shown only when no carousel slides are configured. Use a wide, high-resolution football photo.',
      },
    },
    {
      name: 'homePageInstagramPosts',
      label: 'Homepage Instagram Posts',
      type: 'array',
      maxRows: 5,
      labels: {
        singular: 'Post',
        plural: 'Posts',
      },
      admin: {
        description: 'Add up to five photo or carousel posts. The last row appears first on the homepage; the remaining posts follow their row order. Leave Thumbnail Image empty to show the Instagram embed.',
        initCollapsed: true,
      },
      fields: instagramMediaFields('post'),
    },
    {
      name: 'homePageInstagramReels',
      label: 'Homepage Instagram Reels',
      type: 'array',
      maxRows: 5,
      labels: {
        singular: 'Reel',
        plural: 'Reels',
      },
      admin: {
        description: 'Add up to five Reels with a thumbnail and Instagram URL. Upload an MP4 or WebM in each Reel to autoplay it inline on the homepage.',
        initCollapsed: true,
      },
      fields: instagramMediaFields('reel'),
    },
    {
      name: 'homePageYoutubeHighlights',
      label: 'Homepage YouTube Highlights',
      type: 'array',
      maxRows: 2,
      labels: {
        singular: 'Video',
        plural: 'Videos',
      },
      admin: {
        description: 'Choose up to two YouTube videos for NUSC TV. Paste each video URL, then reorder rows to change their display order.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'videoUrl',
          label: 'YouTube Video URL',
          type: 'text',
          required: true,
          validate: validateYouTubeVideoUrl,
        },
        {
          name: 'title',
          label: 'Display Title',
          type: 'text',
          required: true,
        },
        {
          name: 'category',
          label: 'Category',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      ...seoFields,
      name: 'defaultSEO',
      label: 'Default SEO',
    },
  ],
}
