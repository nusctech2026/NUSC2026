import pg from 'pg'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

export interface MembershipFulfillmentTicket {
  bookingId: string
  eventId: string
  matchDate: string
  opponent: string
  ticketType: string
  zone: string | null
  status: string
}

export interface MembershipFulfillmentOrder {
  orderId: string
  memberId: string
  membershipNumber: string | null
  memberName: string | null
  email: string | null
  phone: string | null
  planSlug: string
  planName: string
  amount: string
  currency: string
  paymentStatus: string
  razorpayOrderId: string | null
  paymentId: string | null
  paidAt: string | null
  createdAt: string
  passId: string | null
  zone: string | null
  issuanceStatus: string
  reservationId: string | null
  tickets: MembershipFulfillmentTicket[]
}

export const MEMBERSHIP_FULFILLMENT_PAGE_SIZES = [5, 10, 25, 50, 100] as const

export interface MembershipFulfillmentOrdersPage {
  orders: MembershipFulfillmentOrder[]
  page: number
  pageSize: (typeof MEMBERSHIP_FULFILLMENT_PAGE_SIZES)[number]
  hasNextPage: boolean
}

type MembershipFulfillmentOrderPageRow = MembershipFulfillmentOrder & { hasNextPage: boolean }

export async function listMembershipFulfillmentOrders(options: { page?: number; pageSize?: number } = {}): Promise<MembershipFulfillmentOrdersPage> {
  const page = typeof options.page === 'number' && Number.isInteger(options.page)
    ? Math.max(1, Math.min(10000, options.page))
    : 1
  const pageSize = MEMBERSHIP_FULFILLMENT_PAGE_SIZES.includes(
    options.pageSize as (typeof MEMBERSHIP_FULFILLMENT_PAGE_SIZES)[number],
  )
    ? options.pageSize as (typeof MEMBERSHIP_FULFILLMENT_PAGE_SIZES)[number]
    : 25
  const offset = (page - 1) * pageSize
  const payload = await getPayload({ config: configPromise })
  // The candidate CTE includes at most one extra ID for next-page detection;
  // order details and ticket aggregation are limited to page_orders below.
  const result = await payload.db.pool.query<MembershipFulfillmentOrderPageRow>(`
      WITH candidate_order_ids AS MATERIALIZED (
        SELECT o.id, o.created_at
          FROM public.membership_payment_orders AS o
          JOIN public.members AS m ON m.id = o.member_id
          JOIN public.membership_plans AS p ON p.id = o.plan_id
         WHERE o.purpose = 'tier'
           AND p.slug IN ('rise-general', 'rise-premium')
         ORDER BY o.created_at DESC, o.id DESC
         LIMIT $1 OFFSET $2
      ), page_orders AS (
        SELECT id, created_at
          FROM candidate_order_ids
         ORDER BY created_at DESC, id DESC
         LIMIT $3
      ), page_metadata AS (
        SELECT COUNT(*) > $3 AS "hasNextPage"
          FROM candidate_order_ids
      )
      SELECT
        o.id::text AS "orderId",
        m.id::text AS "memberId",
        m.membership_number AS "membershipNumber",
        NULLIF(concat_ws(' ', NULLIF(trim(mp.first_name), ''), NULLIF(trim(mp.last_name), '')), '') AS "memberName",
        u.email,
        mp.phone,
        p.slug AS "planSlug",
        p.name AS "planName",
        o.amount::text AS amount,
        o.currency,
        o.status AS "paymentStatus",
        o.razorpay_order_id AS "razorpayOrderId",
        o.payment_id AS "paymentId",
        o.paid_at::text AS "paidAt",
        o.created_at::text AS "createdAt",
        o.ahibi_pass_id AS "passId",
        o.ahibi_zone AS zone,
        o.ahibi_pass_status AS "issuanceStatus",
        o.ahibi_reservation_id AS "reservationId",
        COALESCE(
          jsonb_agg(jsonb_build_object(
            'bookingId', t.ahibi_booking_id,
            'eventId', t.ahibi_event_id,
            'matchDate', t.match_date::text,
            'opponent', t.opponent,
            'ticketType', t.ticket_type,
            'zone', t.zone,
            'status', t.status
          ) ORDER BY t.match_date) FILTER (WHERE t.id IS NOT NULL),
          '[]'::jsonb
        ) AS tickets,
        page_metadata."hasNextPage" AS "hasNextPage"
      FROM page_orders AS selected
      JOIN public.membership_payment_orders o ON o.id = selected.id
      JOIN public.members m ON m.id = o.member_id
      JOIN public.membership_plans p ON p.id = o.plan_id
      LEFT JOIN auth.users u ON u.id = m.user_id::uuid
      LEFT JOIN public.member_profiles mp ON mp.user_id = m.user_id::text
      LEFT JOIN public.membership_season_pass_tickets t ON t.payment_order_id = o.id
      CROSS JOIN page_metadata
      GROUP BY o.id, m.id, p.id, u.email, mp.first_name, mp.last_name, mp.phone,
               selected.created_at, page_metadata."hasNextPage"
      ORDER BY selected.created_at DESC, o.id DESC
    `, [pageSize + 1, offset, pageSize])

  return {
    orders: result.rows.map(({ hasNextPage: _hasNextPage, ...order }) => order),
    page,
    pageSize,
    hasNextPage: result.rows[0]?.hasNextPage ?? false,
  }
}

export async function getMembershipFulfillmentRetryOrder(orderId: string) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const result = await pool.query<{
      orderId: string
      paymentStatus: string
      purpose: string
      planSlug: string
      razorpayOrderId: string | null
      paymentId: string | null
      passId: string | null
      reservationId: string | null
      issuanceStatus: string
    }>(`
      SELECT o.id::text AS "orderId", o.status AS "paymentStatus", o.purpose,
             p.slug AS "planSlug", o.razorpay_order_id AS "razorpayOrderId",
             o.payment_id AS "paymentId", o.ahibi_pass_id AS "passId",
             o.ahibi_reservation_id AS "reservationId", o.ahibi_pass_status AS "issuanceStatus"
        FROM public.membership_payment_orders o
        JOIN public.membership_plans p ON p.id = o.plan_id
       WHERE o.id = $1::uuid
       LIMIT 1
    `, [orderId])
    return result.rows[0] ?? null
  } finally {
    await pool.end()
  }
}
