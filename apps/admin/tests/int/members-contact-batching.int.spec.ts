import { describe, expect, it, vi } from 'vitest'
import { Members } from '../../src/collections/membership/Members'

function getAfterReadHook() {
  const hook = Members.hooks?.afterRead?.[0]
  if (!hook) throw new Error('Members afterRead hook is not configured.')
  return hook
}

const afterRead = getAfterReadHook()

type HookArgs = Parameters<typeof afterRead>[0]

function runAfterRead(
  doc: { id: number; user_id?: string; [key: string]: unknown },
  req: unknown,
  findMany?: boolean,
) {
  return afterRead({ doc, req, findMany } as HookArgs)
}

function makeUserId(index: number) {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`
}

describe('RISE member contact afterRead hook', () => {
  it('includes the created-at timestamp in the default Members columns', () => {
    expect(Members.admin?.defaultColumns).toContain('createdAt')
  })

  it('uses one batched database lookup for a page of 100 members and preserves contact fallbacks', async () => {
    const userIds = Array.from({ length: 100 }, (_, index) => makeUserId(index + 1))
    const query = vi.fn(async (_sql: string, values: unknown[]) => {
      const requestedIds = values[0] as string[]
      return {
        rows: requestedIds.flatMap<{ user_id: string; name: string | null; email: string | null; phone: string | null }>((user_id, index) => {
          if (index === 2) return []
          if (index === 1) {
            return [{ user_id, name: null, email: 'second@example.test', phone: null }]
          }
          return [{
            user_id,
            name: `Member ${index + 1}`,
            email: `member${index + 1}@example.test`,
            phone: `+1000000${index + 1}`,
          }]
        }),
      }
    })
    const req = {
      user: { roles: ['store_manager'] },
      payload: { db: { pool: { query } } },
    }

    const docs = await Promise.all(userIds.map((user_id, index) =>
      runAfterRead({ id: index + 1, user_id }, req, true),
    ))

    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0]?.[0]).toContain('WHERE u.id = ANY($1::uuid[])')
    expect(query.mock.calls[0]?.[1]).toEqual([userIds])
    expect(docs[0]).toMatchObject({
      member_name: 'Member 1',
      contact_email: 'member1@example.test',
      contact_phone: '+10000001',
    })
    expect(docs[1]).toMatchObject({
      member_name: null,
      contact_email: 'second@example.test',
      contact_phone: null,
    })
    expect(docs[2]).toMatchObject({
      member_name: null,
      contact_email: null,
      contact_phone: null,
    })
    expect(String(query.mock.calls[0]?.[0])).toContain('LEFT JOIN public.member_profiles')
    expect(String(query.mock.calls[0]?.[0])).toContain('auth.users')
  })

  it('does not look up contact data when the current user lacks membership read access', async () => {
    const query = vi.fn()
    const req = {
      user: { roles: ['campaign_manager'] },
      payload: { db: { pool: { query } } },
    }
    const doc = { id: 1, user_id: makeUserId(1) }

    await expect(runAfterRead(doc, req, true)).resolves.toEqual(doc)
    expect(query).not.toHaveBeenCalled()
  })

  it('keeps a single-record read scoped to that member', async () => {
    const userId = makeUserId(1)
    const query = vi.fn().mockResolvedValue({
      rows: [{ user_id: userId, name: 'Member One', email: 'one@example.test', phone: '+10000001' }],
    })
    const req = {
      user: { roles: ['store_manager'] },
      payload: { db: { pool: { query } } },
    }

    await runAfterRead({ id: 1, user_id: userId }, req, false)

    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0]?.[0]).toContain('WHERE u.id = $1::uuid LIMIT 1')
    expect(query.mock.calls[0]?.[1]).toEqual([userId])
  })
})
