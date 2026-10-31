import type { CollectionConfig } from 'payload'

const storeManagerRoles = new Set(['super_admin', 'store_manager'])

function canReadJerseyInterests(user: unknown): boolean {
  const roles = (user as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.some((role) => typeof role === 'string' && storeManagerRoles.has(role))
}

export const JerseyInterestRegistrations: CollectionConfig = {
  slug: 'jersey-interest-registrations',
  labels: {
    singular: 'Jersey Interest',
    plural: 'Jersey Interests',
  },
  admin: {
    useAsTitle: 'fullName',
    group: 'Registrations',
    components: {
      beforeListTable: ['./components/JerseyDemandSummary#JerseyDemandSummary'],
    },
    defaultColumns: ['fullName', 'email', 'phone', 'selectedKitsSummary', 'quantity', 'interestStatus', 'createdAt'],
    description: 'Expressions of interest only. No jersey, price, or order is confirmed yet.',
  },
  access: {
    read: ({ req }) => canReadJerseyInterests(req.user),
    create: () => true,
    update: ({ req }) => canReadJerseyInterests(req.user),
    delete: ({ req }) => canReadJerseyInterests(req.user),
  },
  endpoints: [
    {
      path: '/export-csv',
      method: 'get',
      handler: async (req) => {
        if (!canReadJerseyInterests(req.user)) {
          return new Response('Unauthorized', { status: 401 })
        }
        const { payload } = req
        const result = await payload.find({
          collection: 'jersey-interest-registrations',
          limit: 5000,
          depth: 0,
          overrideAccess: true,
        })

        const fieldMap: Record<string, string> = {
          id: 'ID',
          fullName: 'Full Name',
          email: 'Email',
          phone: 'Phone / WhatsApp',
          selectedKitsSummary: 'Selected Kits & Sizes',
          interestedInOfficial: 'Official Kit',
          officialKitSize: 'Official Kit Size',
          interestedInAway: 'Away Kit',
          awayKitSize: 'Away Kit Size',
          interestedInReserve: 'Reserve Kit',
          reserveKitSize: 'Reserve Kit Size',
          quantity: 'Quantity',
          notes: 'Supporter Notes',
          createdAt: 'Submitted At',
        }
        const headers = Object.keys(fieldMap)
        const headerLabels = Object.values(fieldMap)
        const csvRows = [headerLabels.map((label) => `"${label}"`).join(',')]

        for (const doc of result.docs) {
          const docRecord = doc as unknown as Record<string, unknown>
          const row = headers.map((header) => {
            let val = docRecord[header]
            if (val && typeof val === 'object') {
              val = JSON.stringify(val)
            }
            return `"${String(val ?? '').replace(/"/g, '""')}"`
          })
          csvRows.push(row.join(','))
        }

        return new Response(csvRows.join('\n'), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="nusc_jersey_interest_supporters.csv"',
          },
        })
      },
    },
    {
      path: '/stats',
      method: 'get',
      handler: async (req) => {
        if (!canReadJerseyInterests(req.user)) {
          return new Response('Unauthorized', { status: 401 })
        }
        const result = await req.payload.db.pool.query<{
          total: number
          officialCount: number
          awayCount: number
          reserveCount: number
          sizes: Record<string, number> | null
          sizeBreakdown: Record<string, { official: number; away: number; reserve: number }> | null
        }>(`
          WITH registrations AS (
            SELECT
              interested_in_official,
              official_kit_size,
              interested_in_away,
              away_kit_size,
              interested_in_reserve,
              reserve_kit_size,
              usual_size
            FROM public.jersey_interest_registrations
          ),
          registration_counts AS (
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE interested_in_official)::int AS "officialCount",
              COUNT(*) FILTER (WHERE interested_in_away)::int AS "awayCount",
              COUNT(*) FILTER (WHERE interested_in_reserve)::int AS "reserveCount"
            FROM registrations
          ),
          selected_kit_sizes AS (
            SELECT 'official'::text AS kit, official_kit_size AS explicit_size, usual_size
            FROM registrations
            WHERE interested_in_official
            UNION ALL
            SELECT 'away'::text AS kit, away_kit_size AS explicit_size, usual_size
            FROM registrations
            WHERE interested_in_away
            UNION ALL
            SELECT 'reserve'::text AS kit, reserve_kit_size AS explicit_size, usual_size
            FROM registrations
            WHERE interested_in_reserve
          ),
          selected_size_buckets AS (
            SELECT
              kit,
              CASE
                WHEN requested_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Not sure') THEN requested_size
                ELSE 'Not sure'
              END AS bucket
            FROM (
              SELECT
                kit,
                COALESCE(
                  NULLIF(btrim(explicit_size, U&'\\0009\\000A\\000B\\000C\\000D\\0020\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF'), ''),
                  NULLIF(btrim(usual_size, U&'\\0009\\000A\\000B\\000C\\000D\\0020\\00A0\\1680\\2000\\2001\\2002\\2003\\2004\\2005\\2006\\2007\\2008\\2009\\200A\\2028\\2029\\202F\\205F\\3000\\FEFF'), '')
                ) AS requested_size
              FROM selected_kit_sizes
            ) AS normalized_sizes
          ),
          size_bucket_counts AS (
            SELECT kit, bucket, COUNT(*)::int AS count
            FROM selected_size_buckets
            GROUP BY kit, bucket
          ),
          size_buckets(bucket) AS (
            VALUES ('XS'::text), ('S'), ('M'), ('L'), ('XL'), ('XXL'), ('3XL'), ('Not sure')
          ),
          size_breakdown_rows AS (
            SELECT
              buckets.bucket,
              COALESCE(MAX(counts.count) FILTER (WHERE counts.kit = 'official'), 0)::int AS official,
              COALESCE(MAX(counts.count) FILTER (WHERE counts.kit = 'away'), 0)::int AS away,
              COALESCE(MAX(counts.count) FILTER (WHERE counts.kit = 'reserve'), 0)::int AS reserve
            FROM size_buckets AS buckets
            LEFT JOIN size_bucket_counts AS counts ON counts.bucket = buckets.bucket
            GROUP BY buckets.bucket
          ),
          legacy_size_values AS (
            SELECT explicit_sizes.size_value AS size
            FROM registrations
            CROSS JOIN LATERAL (VALUES
              (official_kit_size),
              (away_kit_size),
              (reserve_kit_size)
            ) AS explicit_sizes(size_value)
            WHERE explicit_sizes.size_value IS NOT NULL AND explicit_sizes.size_value <> ''
            UNION ALL
            SELECT usual_size AS size
            FROM registrations
            WHERE usual_size IS NOT NULL
              AND usual_size <> ''
              AND COALESCE(official_kit_size, '') = ''
              AND COALESCE(away_kit_size, '') = ''
              AND COALESCE(reserve_kit_size, '') = ''
          ),
          legacy_size_counts AS (
            SELECT size, COUNT(*)::int AS size_count
            FROM legacy_size_values
            GROUP BY size
          )
          SELECT
            registration_counts.total,
            registration_counts."officialCount",
            registration_counts."awayCount",
            registration_counts."reserveCount",
            COALESCE(
              (SELECT jsonb_object_agg(size, size_count) FROM legacy_size_counts),
              '{}'::jsonb
            ) AS sizes,
            COALESCE(
              (
                SELECT jsonb_object_agg(
                  bucket,
                  jsonb_build_object('official', official, 'away', away, 'reserve', reserve)
                )
                FROM size_breakdown_rows
              ),
              '{}'::jsonb
            ) AS "sizeBreakdown"
          FROM registration_counts
        `)

        return Response.json(result.rows[0] ?? {
          total: 0,
          officialCount: 0,
          awayCount: 0,
          reserveCount: 0,
          sizes: {},
          sizeBreakdown: {},
        })
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const kitParts: string[] = []
        if (data.interestedInOfficial) {
          kitParts.push(`Official (${data.officialKitSize || data.usualSize || 'Size pending'})`)
        }
        if (data.interestedInAway) {
          kitParts.push(`Away (${data.awayKitSize || data.usualSize || 'Size pending'})`)
        }
        if (data.interestedInReserve) {
          kitParts.push(`Reserve (${data.reserveKitSize || data.usualSize || 'Size pending'})`)
        }

        const summary =
          kitParts.length > 0
            ? kitParts.join(' | ')
            : typeof data.selectedKitsSummary === 'string' && data.selectedKitsSummary
              ? data.selectedKitsSummary
              : data.usualSize
                ? `General (${data.usualSize})`
                : 'General Interest'

        return {
          ...data,
          fullName: typeof data.fullName === 'string' ? data.fullName.trim().replace(/\s+/g, ' ') : data.fullName,
          email: typeof data.email === 'string' ? data.email.trim().toLowerCase() : data.email,
          phone: typeof data.phone === 'string' ? data.phone.trim() : data.phone,
          usualSize: typeof data.usualSize === 'string' ? data.usualSize.trim() : data.usualSize,
          selectedKitsSummary: summary,
          interestStatus: 'new',
        }
      },
    ],
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && !req.user) {
          return { ...data, interestStatus: 'new' }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'fullName',
      label: 'Full name',
      type: 'text',
      required: true,
      maxLength: 100,
      validate: (value: unknown) =>
        typeof value === 'string' && value.trim().length >= 2 && value.trim().length <= 100
          ? true
          : 'Enter your name (2 to 100 characters).',
    },
    {
      name: 'email',
      label: 'Email address',
      type: 'email',
      required: true,
      unique: true,
      validate: async (value, { req, id }) => {
        if (typeof value !== 'string' || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Enter a valid email address.'
        }

        const existingInterests = await req.payload.find({
          collection: 'jersey-interest-registrations',
          where: { email: { equals: value.trim().toLowerCase() } },
          limit: 2,
          depth: 0,
          overrideAccess: true,
          req,
        })

        if (existingInterests.docs.some((interest) => String(interest.id) !== String(id))) {
          return 'This email address is already on the jersey interest list.'
        }

        return true
      },
    },
    {
      name: 'phone',
      label: 'Phone / WhatsApp (optional)',
      type: 'text',
      maxLength: 30,
      validate: (value: unknown) =>
        value === undefined || value === null || value === '' || (typeof value === 'string' && /^[+\d() .-]{7,30}$/.test(value))
          ? true
          : 'Enter a valid phone number or leave it blank.',
    },
    {
      name: 'selectedKitsSummary',
      label: 'Selected Kits & Sizes',
      type: 'text',
      admin: {
        description: 'Auto-summarized preferences for quick viewing in lists and exports.',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'interestedInOfficial',
          label: 'Official Kit',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'officialKitSize',
          label: 'Official Kit Size',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Not sure'],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'interestedInAway',
          label: 'Away Kit',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'awayKitSize',
          label: 'Away Kit Size',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Not sure'],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'interestedInReserve',
          label: 'Reserve Kit',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'reserveKitSize',
          label: 'Reserve Kit Size',
          type: 'select',
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Not sure'],
        },
      ],
    },
    {
      name: 'usualSize',
      label: 'General size estimate',
      type: 'text',
      admin: {
        description: 'Fallback/general estimate if individual kit size is not specified.',
      },
    },
    {
      name: 'quantity',
      label: 'How many might you want?',
      type: 'number',
      required: true,
      min: 1,
      max: 10,
      defaultValue: 1,
      validate: (value: unknown) =>
        typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10
          ? true
          : 'Choose a quantity from 1 to 10.',
    },
    {
      name: 'notes',
      label: 'Notes / Supporter Requests',
      type: 'textarea',
    },
    {
      name: 'contactConsent',
      label: 'Agreed to receive jersey updates',
      type: 'checkbox',
      required: true,
      defaultValue: false,
      validate: (value: unknown) => (value === true ? true : 'Consent to receive jersey updates is required.'),
    },
    {
      name: 'interestStatus',
      label: 'Status',
      type: 'text',
      defaultValue: 'new',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
