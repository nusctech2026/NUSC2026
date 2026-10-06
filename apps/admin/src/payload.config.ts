import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'

import { Admins } from './collections/Admins'
import { Media } from './collections/Media'
import { Pages } from './collections/website/Pages'
import { News } from './collections/website/News'
import { Teams } from './collections/website/Teams'
import { Players } from './collections/website/Players'
import { Fixtures } from './collections/website/Fixtures'
import { Events } from './collections/website/Events'
import { Sponsors } from './collections/website/Sponsors'
import { Galleries } from './collections/website/Galleries'
import { WebsiteMedia } from './collections/website/WebsiteMedia'
import { WebsiteSettings } from './globals/website/WebsiteSettings'
import { Navigation } from './globals/website/Navigation'
import { MembershipPlans } from './collections/membership/MembershipPlans'
import { MembershipBenefits } from './collections/membership/MembershipBenefits'
import { Members } from './collections/membership/Members'
import { BenefitRedemptions } from './collections/membership/BenefitRedemptions'
import { TrialRegistrations } from './collections/TrialRegistrations'
import { UserRoles } from './collections/UserRoles'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Admins.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      views: {
        login: {
          Component: './components/CustomLogin#CustomLogin',
        },
        CustomOrders: {
          path: '/orders',
          Component: './components/views/OrdersView#OrdersView',
        },
        CustomFulfilment: {
          path: '/fulfilment',
          Component: './components/views/FulfilmentView#FulfilmentView',
        },
        CustomPayments: {
          path: '/payments',
          Component: './components/views/PaymentsView#PaymentsView',
        },
        CustomReturns: {
          path: '/returns',
          Component: './components/views/ReturnsView#ReturnsView',
        },
        CustomInventory: {
          path: '/inventory',
          Component: './components/views/InventoryView#InventoryView',
        },
        CustomProducts: {
          path: '/products',
          Component: './components/views/ProductsView#ProductsView',
        },
        CustomCategories: {
          path: '/categories',
          Component: './components/views/CategoriesView#CategoriesView',
        },
        CustomProductVariants: {
          path: '/product-variants',
          Component: './components/views/ProductVariantsView#ProductVariantsView',
        },
        CustomProductImages: {
          path: '/product-images',
          Component: './components/views/ProductImagesView#ProductImagesView',
        },
        CustomCoupons: {
          path: '/coupons',
          Component: './components/views/CouponsView#CouponsView',
        },
        CustomCollections: {
          path: '/collections',
          Component: './components/views/CollectionsView#CollectionsView',
        },
        CustomRoles: {
          path: '/roles',
          Component: './components/views/RolesView#RolesView',
        },
        CustomAuditLogs: {
          path: '/audit-logs',
          Component: './components/views/AuditLogsView#AuditLogsView',
        },
        CustomSystemHealth: {
          path: '/system-health',
          Component: './components/views/SystemHealthView#SystemHealthView',
        },
        CustomStaff: {
          path: '/staff',
          Component: './components/views/StaffView#StaffView',
        },
        CustomIntegrations: {
          path: '/integrations',
          Component: './components/views/IntegrationsView#IntegrationsView',
        },
      },
      afterNavLinks: [
        './components/nav/StoreNavLinks#StoreNavLinks',
        './components/nav/StoreNavLinks#CatalogNavLinks',
        './components/nav/StoreNavLinks#SystemNavLinks',
      ]
    }
  },
  collections: [
    Admins,
    Media,
    WebsiteMedia,
    Pages,
    News,
    Teams,
    Players,
    Fixtures,
    Events,
    Sponsors,
    Galleries,
    MembershipPlans,
    MembershipBenefits,
    Members,
    BenefitRedemptions,
    TrialRegistrations,
    UserRoles
  ],
  globals: [
    WebsiteSettings,
    Navigation
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    idType: 'uuid',
    push: process.env.NODE_ENV !== 'production',
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: true,
        'website-media': true,
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'auto',
        forcePathStyle: true,
      },
    }),
  ],
})
