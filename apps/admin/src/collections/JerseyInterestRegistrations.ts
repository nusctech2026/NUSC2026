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
    defaultColumns: ['fullName', 'email', 'phone', 'usualSize', 'quantity', 'interestStatus', 'createdAt'],
    description: 'Expressions of interest only. No jersey, price, or order is confirmed yet.',
  },
  access: {
    read: ({ req }) => canReadJerseyInterests(req.user),
    create: () => true,
    update: ({ req }) => canReadJerseyInterests(req.user),
    delete: ({ req }) => canReadJerseyInterests(req.user),
  },
  hooks: {
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
    },
    {
      name: 'email',
      label: 'Email address',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'phone',
      label: 'Phone / WhatsApp (optional)',
      type: 'text',
      maxLength: 30,
    },
    {
      name: 'usualSize',
      label: 'Usual jersey size (rough estimate)',
      type: 'text',
      admin: {
        description: 'This is only an estimate. The final jersey size chart is not available yet.',
      },
    },
    {
      name: 'quantity',
      label: 'How many might you want?',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      defaultValue: 1,
    },
    {
      name: 'contactConsent',
      label: 'Agreed to receive jersey updates',
      type: 'checkbox',
      required: true,
      defaultValue: false,
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
