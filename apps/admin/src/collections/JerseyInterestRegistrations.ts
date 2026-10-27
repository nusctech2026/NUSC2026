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
        const { payload } = req
        const result = await payload.find({
          collection: 'jersey-interest-registrations',
          limit: 5000,
          depth: 0,
          overrideAccess: true,
        })

        let officialCount = 0
        let awayCount = 0
        let reserveCount = 0
        const sizes: Record<string, number> = {}

        for (const doc of result.docs) {
          const d = doc as unknown as Record<string, unknown>
          if (d.interestedInOfficial) officialCount++
          if (d.interestedInAway) awayCount++
          if (d.interestedInReserve) reserveCount++
          if (typeof d.officialKitSize === 'string' && d.officialKitSize) {
            sizes[d.officialKitSize] = (sizes[d.officialKitSize] || 0) + 1
          }
          if (typeof d.awayKitSize === 'string' && d.awayKitSize) {
            sizes[d.awayKitSize] = (sizes[d.awayKitSize] || 0) + 1
          }
          if (typeof d.reserveKitSize === 'string' && d.reserveKitSize) {
            sizes[d.reserveKitSize] = (sizes[d.reserveKitSize] || 0) + 1
          }

          if (d.usualSize && !d.officialKitSize && !d.awayKitSize && !d.reserveKitSize) {
            const sz = String(d.usualSize)
            sizes[sz] = (sizes[sz] || 0) + 1
          }
        }

        return Response.json({
          total: result.totalDocs,
          officialCount,
          awayCount,
          reserveCount,
          sizes,
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
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'],
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
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'],
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
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Not sure'],
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
