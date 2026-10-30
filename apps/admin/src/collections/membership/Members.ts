import type { CollectionConfig, PayloadRequest } from 'payload'

type MemberContact = { name: string | null; email: string | null; phone: string | null }

const contactRoles = new Set(['super_admin', 'store_manager', 'membership_manager', 'support', 'fulfillment_staff'])

function canReadMemberContacts(user: unknown): boolean {
  const roles = (user as { roles?: unknown } | null)?.roles
  return Array.isArray(roles) && roles.some((role) => typeof role === 'string' && contactRoles.has(role))
}

type MemberContactRow = MemberContact & { user_id: string }
type MemberContactBatch = {
  userIds: Set<string>
  promise: Promise<Map<string, MemberContact>>
  resolve: (contacts: Map<string, MemberContact>) => void
  reject: (error: unknown) => void
}

const memberContactDetails = `NULLIF(concat_ws(' ', NULLIF(trim(p.first_name), ''), NULLIF(trim(p.last_name), '')), '') AS name,
  u.email, p.phone`
const memberContactFrom = `FROM auth.users AS u
  LEFT JOIN public.member_profiles AS p ON p.user_id = u.id::text`
const memberContactBatches = new WeakMap<object, MemberContactBatch>()

async function findMemberContact(
  req: PayloadRequest,
  userId: string,
  findMany?: boolean,
): Promise<MemberContact | undefined> {
  if (!findMany) {
    const result = await req.payload.db.pool.query<MemberContact>(
      `SELECT ${memberContactDetails} ${memberContactFrom} WHERE u.id = $1::uuid LIMIT 1`,
      [userId],
    )
    return result.rows[0]
  }

  const existingBatch = memberContactBatches.get(req)
  if (existingBatch) {
    existingBatch.userIds.add(userId)
    return existingBatch.promise.then((contacts) => contacts.get(userId))
  }

  let resolveBatch!: (contacts: Map<string, MemberContact>) => void
  let rejectBatch!: (error: unknown) => void
  const promise = new Promise<Map<string, MemberContact>>((resolve, reject) => {
    resolveBatch = resolve
    rejectBatch = reject
  })
  const newBatch: MemberContactBatch = {
    userIds: new Set([userId]),
    promise,
    resolve: resolveBatch,
    reject: rejectBatch,
  }

  memberContactBatches.set(req, newBatch)
  queueMicrotask(async () => {
    // Payload invokes findMany afterRead hooks concurrently. Remove this batch before
    // awaiting the query so a later operation on this request gets its own IDs.
    if (memberContactBatches.get(req) === newBatch) memberContactBatches.delete(req)
    try {
      const result = await req.payload.db.pool.query<MemberContactRow>(
        `SELECT u.id::text AS user_id, ${memberContactDetails} ${memberContactFrom} WHERE u.id = ANY($1::uuid[])`,
        [[...newBatch.userIds]],
      )
      newBatch.resolve(new Map(result.rows.map(({ user_id, ...contact }) => [user_id, contact])))
    } catch (error) {
      newBatch.reject(error)
    }
  })

  return newBatch.promise.then((contacts) => contacts.get(userId))
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
    afterRead: [async ({ doc, findMany, req }) => {
      if (!canReadMemberContacts(req.user) || typeof doc.user_id !== 'string') return doc

      const contact = await findMemberContact(req, doc.user_id, findMany)
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
