import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  query: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import {
  listMembershipFulfillmentOrders,
  MEMBERSHIP_FULFILLMENT_PAGE_SIZES,
} from '../../src/utils/membershipFulfillmentDb'

describe('Membership Fulfillment pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPayload.mockResolvedValue({ db: { pool: { query: mocks.query } } })
  })

  it('loads one page of orders, groups tickets for only those orders, and reports whether another page exists', async () => {
    const row = {
      orderId: 'order-2',
      memberId: 'member-2',
      membershipNumber: 'NUSC-2',
      memberName: 'Demo Member',
      email: 'demo@example.test',
      phone: '9000000002',
      planSlug: 'rise-premium',
      planName: 'Rise Premium',
      amount: '100',
      currency: 'INR',
      paymentStatus: 'paid',
      razorpayOrderId: 'razorpay-order-2',
      paymentId: 'payment-2',
      paidAt: '2026-10-30T10:00:00.000Z',
      createdAt: '2026-10-30T09:00:00.000Z',
      passId: 'premium-season',
      zone: 'West',
      issuanceStatus: 'issued',
      reservationId: 'reservation-2',
      tickets: [{
        bookingId: 'booking-2',
        eventId: 'event-2',
        matchDate: '2026-11-01',
        opponent: 'Demo FC',
        ticketType: 'Premium',
        zone: 'West',
        status: 'issued',
      }],
      hasNextPage: true,
    }
    mocks.query.mockResolvedValue({ rows: [row] })

    const result = await listMembershipFulfillmentOrders({ page: 3, pageSize: 10 })

    expect(MEMBERSHIP_FULFILLMENT_PAGE_SIZES).toEqual([5, 10, 25, 50, 100])
    expect(mocks.getPayload).toHaveBeenCalledTimes(1)
    expect(mocks.query).toHaveBeenCalledTimes(1)
    const [sql, values] = mocks.query.mock.calls[0] as [string, number[]]
    const { hasNextPage: _hasNextPage, ...expectedOrder } = row
    expect(values).toEqual([11, 20, 10])
    expect(sql).toContain('WITH candidate_order_ids AS MATERIALIZED')
    expect(sql).toContain('LIMIT $1 OFFSET $2')
    expect(sql).toContain('LIMIT $3')
    expect(sql).toContain('COUNT(*) > $3 AS "hasNextPage"')
    expect(sql).toContain("o.purpose = 'tier'")
    expect(sql).toContain("p.slug IN ('rise-general', 'rise-premium')")
    expect(sql.indexOf('FROM page_orders AS selected')).toBeLessThan(
      sql.indexOf('LEFT JOIN public.membership_season_pass_tickets'),
    )
    expect(result).toEqual({
      orders: [expectedOrder],
      page: 3,
      pageSize: 10,
      hasNextPage: true,
    })
  })

  it('validates the page and falls back to the supported default page size', async () => {
    mocks.query.mockResolvedValue({ rows: [] })

    const result = await listMembershipFulfillmentOrders({ page: 0, pageSize: 7 })

    expect(mocks.query.mock.calls[0]?.[1]).toEqual([26, 0, 25])
    expect(result).toEqual({ orders: [], page: 1, pageSize: 25, hasNextPage: false })
  })
})
