import { describe, expect, it } from 'vitest'
import { hasOnlyCampaignRoles, isCampaignOnlyStaff } from '../../src/auth/staffRoles'

describe('campaign staff portal role boundary', () => {
  it('recognizes campaign-only manager, reviewer, and gate staff accounts', () => {
    expect(hasOnlyCampaignRoles(['campaign_manager'])).toBe(true)
    expect(hasOnlyCampaignRoles(['reviewer'])).toBe(true)
    expect(hasOnlyCampaignRoles(['gate_staff'])).toBe(true)
    expect(isCampaignOnlyStaff({ display_roles: [{ role: 'campaign_manager' }] })).toBe(true)
  })

  it('does not treat mixed or unrelated staff roles as campaign-only', () => {
    expect(hasOnlyCampaignRoles([])).toBe(false)
    expect(hasOnlyCampaignRoles(['campaign_manager', 'store_manager'])).toBe(false)
    expect(isCampaignOnlyStaff({ roles: ['trials_manager'] })).toBe(false)
    expect(isCampaignOnlyStaff({ roles: ['campaign_manager', 'super_admin'] })).toBe(false)
    expect(isCampaignOnlyStaff({ roles: ['campaign_manager', 'unexpected_role'] })).toBe(true)
  })
})
