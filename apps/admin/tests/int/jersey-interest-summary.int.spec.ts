import { describe, expect, it, vi } from 'vitest'
import { JerseyInterestRegistrations } from '../../src/collections/JerseyInterestRegistrations'

const statsEndpoint = Array.isArray(JerseyInterestRegistrations.endpoints)
  ? JerseyInterestRegistrations.endpoints.find(({ path }) => path === '/stats')
  : undefined
if (!statsEndpoint) throw new Error('Jersey Interest stats endpoint is not configured.')

const statsHandler = statsEndpoint.handler

function makeRequest(roles: string[], rows: Record<string, unknown>[]) {
  const query = vi.fn().mockResolvedValue({ rows })
  const req = {
    user: { roles },
    payload: { db: { pool: { query } } },
  }

  return { req, query }
}

describe('Jersey Interest summary', () => {
  it('returns total, kit totals, legacy sizes, and per-kit size breakdown from one aggregate query', async () => {
    const row = {
      total: 3,
      officialCount: 2,
      awayCount: 1,
      reserveCount: 1,
      sizes: { M: 2, L: 1 },
      sizeBreakdown: {
        XS: { official: 0, away: 0, reserve: 0 },
        S: { official: 0, away: 0, reserve: 0 },
        M: { official: 1, away: 1, reserve: 0 },
        L: { official: 1, away: 0, reserve: 1 },
        XL: { official: 0, away: 0, reserve: 0 },
        XXL: { official: 0, away: 0, reserve: 0 },
        'Not sure': { official: 0, away: 0, reserve: 0 },
      },
    }
    const { req, query } = makeRequest(['store_manager'], [row])

    const response = await statsHandler(req as never)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(row)
    expect(query).toHaveBeenCalledTimes(1)
    const sql = String(query.mock.calls[0]?.[0])
    expect(sql).toContain('FROM public.jersey_interest_registrations')
    expect(sql).toContain('AS "sizeBreakdown"')
    expect(sql).toContain('WHEN requested_size IN')
    expect(sql).toContain("ELSE 'Not sure'")
    expect(sql).toContain('NULLIF(btrim(explicit_size')
    expect(sql).toContain("COALESCE(official_kit_size, '') = ''")
  })

  it('keeps the summary protected for users without Jersey Interest access', async () => {
    const { req, query } = makeRequest(['reviewer'], [])

    const response = await statsHandler(req as never)

    expect(response.status).toBe(401)
    expect(query).not.toHaveBeenCalled()
  })

  it('returns empty legacy and kit-size totals when the aggregate has no row', async () => {
    const { req } = makeRequest(['super_admin'], [])

    const response = await statsHandler(req as never)

    await expect(response.json()).resolves.toEqual({
      total: 0,
      officialCount: 0,
      awayCount: 0,
      reserveCount: 0,
      sizes: {},
      sizeBreakdown: {},
    })
  })
})
