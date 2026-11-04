import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingIncludes: {
    '/admin/\\[\\[\\.\\.\\.segments\\]\\]': ['./src/utils/fonts/*.ttf'],
    '/admin/campaign/applications/*': ['./src/utils/fonts/*.ttf'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname, '../../'),
  },
  serverExternalPackages: ['pg', '@resvg/resvg-js'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
