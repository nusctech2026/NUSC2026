import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertStaffRole: vi.fn(),
  listMembershipFulfillmentOrders: vi.fn(),
}))

vi.mock('../../src/utils/supabaseServerClient', () => ({ assertStaffRole: mocks.assertStaffRole }))
vi.mock('../../src/utils/membershipFulfillmentDb', () => ({
  listMembershipFulfillmentOrders: mocks.listMembershipFulfillmentOrders,
  MEMBERSHIP_FULFILLMENT_PAGE_SIZES: [5, 10, 25, 50, 100],
}))
vi.mock('../../src/app/(payload)/admin/membership-fulfillment/actions', () => ({
  recoverMissingPremiumTicketsAction: vi.fn(),
  retryMembershipTicketIssuanceAction: vi.fn(),
}))

import MembershipFulfillmentPage from '../../src/app/(payload)/admin/membership-fulfillment/page'

type ElementLike = { type: unknown; props: { children?: unknown; [key: string]: unknown } }

function collectElements(node: unknown): ElementLike[] {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(collectElements)
  if (!('type' in node) || !('props' in node)) return []
  const element = node as ElementLike
  return [element, ...collectElements(element.props.children)]
}

describe('Membership Fulfillment page pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the staff authorization gate ahead of loading orders', async () => {
    mocks.assertStaffRole.mockRejectedValue(new Error('Access denied'))

    const page = await MembershipFulfillmentPage({ searchParams: Promise.resolve({ page: '2' }) })

    expect(mocks.assertStaffRole).toHaveBeenCalledWith(['store_manager', 'membership_manager'])
    expect(mocks.listMembershipFulfillmentOrders).not.toHaveBeenCalled()
    expect(page.type).toBe('main')
  })

  it('passes selected pagination to the loader and renders supported page controls', async () => {
    mocks.assertStaffRole.mockResolvedValue({ roles: ['membership_manager'] })
    mocks.listMembershipFulfillmentOrders.mockResolvedValue({
      orders: [],
      page: 2,
      pageSize: 50,
      hasNextPage: true,
    })

    const page = await MembershipFulfillmentPage({
      searchParams: Promise.resolve({ page: '2', pageSize: '50' }),
    })
    const elements = collectElements(page)
    const select = elements.find((element) => element.type === 'select')
    const links = elements.filter((element) => element.type === 'a')

    expect(mocks.assertStaffRole).toHaveBeenCalledWith(['store_manager', 'membership_manager'])
    expect(mocks.listMembershipFulfillmentOrders).toHaveBeenCalledWith({ page: 2, pageSize: 50 })
    expect(select?.props.name).toBe('pageSize')
    const options = collectElements(select?.props.children).filter((element) => element.type === 'option')
    expect(options.map((option) => option.props.value)).toEqual([5, 10, 25, 50, 100])
    expect(links.map((link) => link.props.href)).toEqual(['?page=1&pageSize=50', '?page=3&pageSize=50'])
  })
})
