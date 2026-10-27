import { CollectionConfig } from 'payload'

type MemberContact = { name: string | null; email: string | null; phone: string | null }

const contactRoles = new Set(['super_admin', 'store_manager', 'membership_manager', 'support', 'fulfillment_staff'])

function canReadMemberContacts(user: unknown): boolean {
  const roles = (user as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.some((role) => typeof role === 'string' && contactRoles.has(role))
}

export const Members: CollectionConfig = {
  slug: 'members',
  admin: {
    useAsTitle: 'membership_number',
    group: 'Membership',
    defaultColumns: ['membership_number', 'member_name', 'contact_email', 'contact_phone', 'plan', 'status', 'registration_payment_status'],
    components: {
      beforeListTable: [
        './components/membership/MemberSummary#MemberSummary',
        './components/membership/ResetMemberColumns#ResetMemberColumns',
      ],
    },
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
  },
  endpoints: [
    {
      path: '/stats',
      method: 'get',
      handler: async (req) => {
        if (!canReadMemberContacts(req.user)) {
          return new Response('Unauthorized', { status: 401 })
        }

        const result = await req.payload.db.pool.query<{
          total: number
          active: number
          registrationPending: number
          riseGeneralActive: number
          risePremiumActive: number
        }>(`
          SELECT
            count(*)::int AS total,
            count(*) FILTER (WHERE m.status = 'active')::int AS active,
            count(*) FILTER (WHERE m.registration_payment_status = 'pending')::int AS "registrationPending",
            count(*) FILTER (WHERE m.status = 'active' AND p.slug = 'rise-general')::int AS "riseGeneralActive",
            count(*) FILTER (WHERE m.status = 'active' AND p.slug = 'rise-premium')::int AS "risePremiumActive"
          FROM public.members AS m
          LEFT JOIN public.membership_plans AS p ON p.id = m.plan_id
        `)

        return Response.json(result.rows[0] ?? {
          total: 0,
          active: 0,
          registrationPending: 0,
          riseGeneralActive: 0,
          risePremiumActive: 0,
        })
      },
    },
  ],
  forceSelect: { user_id: true },
  hooks: {
    afterRead: [async ({ doc, req }) => {
      if (!canReadMemberContacts(req.user) || typeof doc.user_id !== 'string') return doc

      const result = await req.payload.db.pool.query<MemberContact>(
        `SELECT NULLIF(concat_ws(' ', NULLIF(trim(p.first_name), ''), NULLIF(trim(p.last_name), '')), '') AS name,
                u.email, p.phone
           FROM auth.users AS u
           LEFT JOIN public.member_profiles AS p ON p.user_id = u.id::text
          WHERE u.id = $1::uuid
          LIMIT 1`,
        [doc.user_id],
      )
      const contact = result.rows[0]
      return {
        ...doc,
        member_name: contact?.name ?? null,
        contact_email: contact?.email ?? null,
        contact_phone: contact?.phone ?? null,
      }
    }],
  },
  fields: [
    {
      name: 'member_name',
      type: 'text',
      label: 'Name',
      virtual: true,
      admin: { readOnly: true },
    },
    {
      name: 'contact_email',
      type: 'email',
      label: 'Email',
      virtual: true,
      admin: { readOnly: true },
    },
    {
      name: 'contact_phone',
      type: 'text',
      label: 'Phone',
      virtual: true,
      admin: { readOnly: true },
    },
    {
      name: 'user_id',
      type: 'text',
      required: true,
      admin: {
        description: 'Supabase auth.user UUID',
      },
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'membership_plans',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Expired', value: 'expired' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Pending Payment', value: 'pending_payment' },
      ],
      defaultValue: 'active',
      required: true,
    },
    {
      name: 'start_date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'end_date',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'lead_member',
      type: 'relationship',
      relationTo: 'members',
    },
    {
      name: 'payment_id',
      type: 'text',
    },
    {
      name: 'membership_number',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
      }
    },
    {
      name: 'registration_payment_status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'registration_payment_id',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'registration_order_id',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
  ],
}
