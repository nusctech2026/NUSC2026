export const accreditationCategories = [
  'ahibi',
  'volunteer',
  'media',
  'crew',
  'management',
  'officials',
  'medical',
] as const

export type AccreditationCategory = (typeof accreditationCategories)[number]
export type ScanAction = 'check_in' | 'check_out'
export type CheckpointType = 'gate' | 'booth'
export type ScanStatus = 'pending' | 'confirmed' | 'rejected' | 'conflict'

export type SnapshotCredential = {
  tokenHash: string
  printedIdHash: string
  idNumber: string
  fullName: string
  category: AccreditationCategory
  role: string
  photoAvailable: boolean
  validFrom: string
  validUntil: string
}

export type OfflineSnapshot = {
  version: 1
  snapshotId: string
  staffUserId: string
  issuedAt: string
  expiresAt: string
  event: {
    id: string
    title: string
    startDate: string
    endDate: string
    isTest: boolean
  }
  credentials: SnapshotCredential[]
}

export type ScanPayload = {
  qrValue: string
  eventId: string
  action: ScanAction
  checkpointType: CheckpointType
  checkpoint: string
  capturedAt: string
  snapshotVersion: number | null
  localMatch: SnapshotCredential | null
}

export type ServerScanResult = {
  success: boolean
  code?: string
  message?: string
  action?: ScanAction
  checkpoint_type?: CheckpointType
  match_title?: string
  scanned_at?: string
  first_scanned_at?: string
  first_gate?: string
  idempotent_replay?: boolean
  candidate?: {
    full_name?: string
    id_number?: string
    category?: string
    assigned_role?: string
    assigned_zone?: string | null
    assigned_shift?: string | null
    photo_available?: boolean
    signedPhotoUrl?: string | null
  }
}

const printedIdPattern = /^NUSC-ID-\d{4}-[A-Z0-9]{6,32}$/i
const qrTokenPattern = /^[0-9a-f]{64}$/i
const conflictCodes = new Set([
  'ALREADY_CHECKED_IN',
  'ALREADY_CHECKED_OUT',
  'IDEMPOTENCY_CONFLICT',
])

export function normalizeScannerCredential(value: string) {
  const trimmed = value.trim()
  return printedIdPattern.test(trimmed) ? trimmed.toUpperCase() : trimmed.toLowerCase()
}

export function isRecognizedScannerCredential(value: string) {
  const normalized = normalizeScannerCredential(value)
  return printedIdPattern.test(normalized) || qrTokenPattern.test(normalized)
}

export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function findSnapshotCredential(
  snapshot: OfflineSnapshot,
  value: string,
  at = new Date().toISOString(),
  action: ScanAction = 'check_in',
) {
  const normalized = normalizeScannerCredential(value)
  if (!isRecognizedScannerCredential(normalized)) return null
  const digest = await sha256Hex(normalized)
  const isPrintedId = printedIdPattern.test(normalized)
  const scannedAt = Date.parse(at)
  if (!Number.isFinite(scannedAt)) return null
  return snapshot.credentials.find((credential) => {
    const validFrom = Date.parse(credential.validFrom)
    const validUntil = Date.parse(credential.validUntil)
    const hashMatches = isPrintedId ? credential.printedIdHash === digest : credential.tokenHash === digest
    if (!hashMatches) return false
    if (action === 'check_out') return true
    return Number.isFinite(validFrom)
      && Number.isFinite(validUntil)
      && validFrom <= scannedAt
      && validUntil >= scannedAt
  }) ?? null
}

export function isSnapshotUsable(
  snapshot: OfflineSnapshot | null,
  staffUserId: string,
  eventId: string,
  now = Date.now(),
) {
  if (!snapshot || snapshot.version !== 1) return false
  if (snapshot.staffUserId !== staffUserId || snapshot.event.id !== eventId) return false
  const issued = Date.parse(snapshot.issuedAt)
  const expires = Date.parse(snapshot.expiresAt)
  return Number.isFinite(issued) && Number.isFinite(expires) && issued <= now && expires > now
}

export function classifyServerResult(result: ServerScanResult): ScanStatus {
  if (result.success) return 'confirmed'
  if (result.code && conflictCodes.has(result.code)) return 'conflict'
  return 'rejected'
}

export function retryDelayMs(attempts: number) {
  const safeAttempts = Math.max(1, Math.min(10, Math.floor(attempts)))
  return Math.min(60_000, 1_000 * (2 ** (safeAttempts - 1)))
}
