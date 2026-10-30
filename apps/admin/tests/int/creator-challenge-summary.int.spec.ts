import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  assertStaffRole: vi.fn(),
  getPayload: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('../../src/utils/supabaseServerClient', () => ({
  assertStaffRole: mocks.assertStaffRole,
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}))

import { getCreatorChallengeSummary } from '../../src/actions/creatorChallengeActions'

describe('Creator Challenge summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all existing statistics from one PostgreSQL aggregate', async () => {
    const row = {
      total: 37,
      poster: 11,
      football_edits: 15,
      fan_voice: 11,
      matchday_1: 0,
      matchday_2: 1,
      matchday_3: 2,
      matchday_4: 3,
      matchday_5: 4,
      matchday_6: 5,
      matchday_7: 6,
      matchday_8: 7,
      matchday_9: 8,
      matchday_10: 1,
    }
    const query = vi.fn(async (_sql: string) => ({ rows: [row] }))
    mocks.assertStaffRole.mockResolvedValue({ roles: ['campaign_manager'] })
    mocks.getPayload.mockResolvedValue({ db: { pool: { query } } })

    const summary = await getCreatorChallengeSummary()

    expect(mocks.assertStaffRole).toHaveBeenCalledWith(['super_admin', 'campaign_manager', 'reviewer'])
    expect(mocks.getPayload).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledTimes(1)
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain('FROM public.creator_challenge_entries')
    expect(sql).toContain('COUNT(*)::int AS total')
    for (const category of ['poster', 'football_edits', 'fan_voice']) {
      expect(sql).toContain(`WHERE category = '${category}'`)
    }
    for (let matchday = 1; matchday <= 10; matchday++) {
      expect(sql).toContain(`WHERE matchday_number = ${matchday}`)
    }
    expect(summary).toEqual({
      total: 37,
      categories: { poster: 11, football_edits: 15, fan_voice: 11 },
      matchdays: [0, 1, 2, 3, 4, 5, 6, 7, 8, 1],
      canDeleteEntries: true,
    })
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('preserves reviewer read access without granting entry deletion controls', async () => {
    mocks.assertStaffRole.mockResolvedValue({ roles: ['reviewer'] })
    mocks.getPayload.mockResolvedValue({ db: { pool: { query: vi.fn(async () => ({ rows: [{}] })) } } })

    const summary = await getCreatorChallengeSummary()

    expect(summary.canDeleteEntries).toBe(false)
  })

  it('checks the existing staff roles before initializing Payload or querying statistics', async () => {
    const denied = new Error('Access denied')
    mocks.assertStaffRole.mockRejectedValue(denied)

    await expect(getCreatorChallengeSummary()).rejects.toBe(denied)

    expect(mocks.assertStaffRole).toHaveBeenCalledWith(['super_admin', 'campaign_manager', 'reviewer'])
    expect(mocks.getPayload).not.toHaveBeenCalled()
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled()
  })
})
