import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { createAdminClient } from '@nusc/db/src/client/admin'
import { getScannerAuthorization } from '@/lib/scanner-auth'
import { isSameOriginRequest, scannerJson } from '@/lib/http'
import { accreditationCategories, type AccreditationCategory, type OfflineSnapshot } from '@/lib/offline-model'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const snapshotLifetimeMs = 8 * 60 * 60 * 1000
const batchSize = 500

type CampaignEvent = {
  id: string
  title: string
  start_date: string
  end_date: string
  is_active: boolean
  is_test: boolean
}

type CampaignRole = { name: string; category: string; is_active: boolean }
type CampaignApplication = {
  id: string
  full_name: string
  category: string
  application_status: string
  photo_storage_path: string | null
  event_id: string | null
  availability_mode: string | null
  availability_match_ids: string[] | null
  role: CampaignRole | CampaignRole[] | null
}
type CampaignCredential = {
  id: string
  id_number: string
  qr_token: string
  valid_from: string
  valid_until: string
  application: CampaignApplication | CampaignApplication[]
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function inEventScope(application: CampaignApplication, event: CampaignEvent) {
  if (application.event_id && application.event_id !== event.id) return false
  const availabilityMode = application.availability_mode || 'all'
  if (event.is_test && availabilityMode !== 'all') return false
  if (!event.is_test && availabilityMode === 'selected') {
    return (application.availability_match_ids ?? []).includes(event.id)
  }
  return true
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return scannerJson({ error: 'Request origin could not be verified.', code: 'ORIGIN_DENIED' }, 403)
  }

  const authorization = await getScannerAuthorization()
  if (authorization.status === 'unauthenticated') {
    return scannerJson({ error: 'Your session has expired. Sign in again.', code: 'AUTH_REQUIRED' }, 401)
  }
  if (authorization.status === 'forbidden') {
    return scannerJson({ error: 'This account is not authorized to prepare an offline scanner.', code: 'SCANNER_ACCESS_DENIED' }, 403)
  }
  if (authorization.status === 'unavailable') {
    return scannerJson({ error: 'Scanner access could not be verified. Try again.', code: 'AUTH_UNAVAILABLE' }, 503)
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return scannerJson({ error: 'Send a valid snapshot request.', code: 'INVALID_REQUEST' }, 415)
  }
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 1024) return scannerJson({ error: 'Snapshot request is too large.', code: 'INVALID_REQUEST' }, 413)

  const body: unknown = await request.json().catch(() => null)
  const eventId = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>).eventId
    : null
  if (typeof eventId !== 'string' || !uuidPattern.test(eventId)) {
    return scannerJson({ error: 'Choose a valid match before preparing offline scanning.', code: 'INVALID_MATCH' }, 400)
  }

  try {
    const supabase = createAdminClient()
    const { data: eventData, error: eventError } = await supabase
      .from('campaign_events')
      .select('id, title, start_date, end_date, is_active, is_test')
      .eq('id', eventId)
      .maybeSingle()

    if (eventError) return scannerJson({ error: 'Match data is unavailable.', code: 'SNAPSHOT_UNAVAILABLE' }, 503)
    const event = eventData as CampaignEvent | null
    if (!event || !event.is_active) {
      return scannerJson({ error: 'This match is unavailable for offline preparation.', code: 'INVALID_MATCH' }, 404)
    }

    const now = new Date()
    const credentials: CampaignCredential[] = []
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await supabase
        .from('campaign_ids')
        .select(`
          id, id_number, qr_token, valid_from, valid_until,
          application:campaign_applications!inner (
            id, full_name, category, application_status, photo_storage_path, event_id, availability_mode, availability_match_ids,
            role:campaign_roles!assigned_role_id (name, category, is_active)
          )
        `)
        .eq('is_active', true)
        .is('revoked_at', null)
        .lte('valid_from', event.end_date)
        .gte('valid_until', event.start_date)
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (error) return scannerJson({ error: 'Credential data is unavailable.', code: 'SNAPSHOT_UNAVAILABLE' }, 503)
      const batch = (data ?? []) as unknown as CampaignCredential[]
      credentials.push(...batch)
      if (batch.length < batchSize) break
    }

    const acceptedCategories = new Set<string>(accreditationCategories)
    const snapshotCredentials = credentials.flatMap((credential) => {
      const application = one(credential.application)
      const role = one(application?.role)
      if (!application || !role) return []
      if (application.application_status !== 'approved' || !acceptedCategories.has(application.category)) return []
      if (!role.is_active || role.category !== application.category || !inEventScope(application, event)) return []
      if (!/^[0-9a-f]{64}$/i.test(credential.qr_token)) return []

      return [{
        tokenHash: digest(credential.qr_token.toLowerCase()),
        printedIdHash: digest(credential.id_number.toUpperCase()),
        idNumber: credential.id_number,
        fullName: application.full_name,
        category: application.category as AccreditationCategory,
        role: role.name,
        photoAvailable: Boolean(application.photo_storage_path),
        validFrom: credential.valid_from,
        validUntil: credential.valid_until,
      }]
    })

    const issuedAt = now.toISOString()
    const snapshot: OfflineSnapshot = {
      version: 1,
      snapshotId: randomUUID(),
      staffUserId: authorization.staff.userId,
      issuedAt,
      expiresAt: new Date(now.getTime() + snapshotLifetimeMs).toISOString(),
      event: {
        id: event.id,
        title: event.title,
        startDate: event.start_date,
        endDate: event.end_date,
        isTest: event.is_test,
      },
      credentials: snapshotCredentials,
    }

    return scannerJson({ success: true, snapshot })
  } catch {
    return scannerJson({ error: 'Offline preparation could not be completed.', code: 'SNAPSHOT_UNAVAILABLE' }, 503)
  }
}
