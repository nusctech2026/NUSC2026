import 'server-only'

import { createAdminClient } from '@nusc/db/src/client/admin'
import { getScannerAuthorization } from '@/lib/scanner-auth'
import { isSameOriginRequest, scannerJson } from '@/lib/http'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const printedIdPattern = /^NUSC-ID-\d{4}-[A-Z0-9]{6,32}$/i
const qrTokenPattern = /^[0-9a-f]{64}$/i
const gates = new Set(['Gate 1', 'Gate 2', 'Gate 3', 'Gate 4'])

type ScanInput = {
  operationId?: string
  qrValue: string
  action: 'check_in' | 'check_out'
  checkpointType: 'gate' | 'booth'
  checkpoint: string
  eventId: string
}

type RpcResult = {
  success: boolean
  code?: string
  message?: string
  action?: 'check_in' | 'check_out'
  checkpoint_type?: 'gate' | 'booth'
  match_title?: string
  scanned_at?: string
  first_scanned_at?: string
  first_gate?: string
  candidate?: Record<string, unknown>
}

function resultFailure(code: string, message: string) {
  return scannerJson({ success: false, code, message })
}

function parseInput(value: unknown): ScanInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (body.operationId !== undefined && (typeof body.operationId !== 'string' || !uuidPattern.test(body.operationId))) return null
  if (typeof body.qrValue !== 'string' || body.qrValue.trim().length === 0 || body.qrValue.length > 160) return null
  if (body.action !== 'check_in' && body.action !== 'check_out') return null
  if (body.checkpointType !== 'gate' && body.checkpointType !== 'booth') return null
  if (typeof body.checkpoint !== 'string' || typeof body.eventId !== 'string') return null

  const checkpoint = body.checkpoint.trim()
  if (body.checkpointType === 'gate' ? !gates.has(checkpoint) : checkpoint.length < 2 || checkpoint.length > 100) {
    return null
  }
  if (!uuidPattern.test(body.eventId)) return null

  return {
    ...(typeof body.operationId === 'string' ? { operationId: body.operationId } : {}),
    qrValue: body.qrValue.trim(),
    action: body.action,
    checkpointType: body.checkpointType,
    checkpoint,
    eventId: body.eventId,
  }
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
    return scannerJson({ error: 'This account is not authorized to scan workforce IDs.', code: 'SCANNER_ACCESS_DENIED' }, 403)
  }
  if (authorization.status === 'unavailable') {
    return scannerJson({ error: 'Scanner access could not be verified. Try again.', code: 'AUTH_UNAVAILABLE' }, 503)
  }

  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return scannerJson({ error: 'Send a valid scan request.', code: 'INVALID_REQUEST' }, 415)
  }
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 4096) {
    return scannerJson({ error: 'Scan request is too large.', code: 'INVALID_REQUEST' }, 413)
  }

  const parsedBody: unknown = await request.json().catch(() => null)
  const input = parseInput(parsedBody)
  if (!input) {
    return resultFailure('INVALID_REQUEST', 'Choose a match and valid checkpoint, then scan or enter the workforce ID.')
  }

  try {
    const supabase = createAdminClient()
    let qrToken = input.qrValue

    if (printedIdPattern.test(qrToken)) {
      const { data, error } = await supabase
        .from('campaign_ids')
        .select('qr_token')
        .eq('id_number', qrToken.toUpperCase())
        .maybeSingle()

      if (error) {
        return scannerJson({
          error: 'Attendance could not be confirmed. Check the scan before retrying.',
          code: 'SYSTEM_ERROR',
        }, 503)
      }
      if (!data || typeof data.qr_token !== 'string') {
        return resultFailure('INVALID_TOKEN', 'Credential not recognised.')
      }
      qrToken = data.qr_token
    }

    if (!qrTokenPattern.test(qrToken)) {
      return resultFailure('INVALID_TOKEN', 'Credential not recognised.')
    }

    const rpcName = input.operationId
      ? 'record_campaign_attendance_scan_idempotent'
      : 'record_campaign_attendance_scan'
    const rpcArgs = {
      p_qr_token: qrToken,
      p_action: input.action,
      p_checkpoint_type: input.checkpointType,
      p_checkpoint: input.checkpoint,
      p_event_id: input.eventId,
      p_scanned_by: authorization.staff.email,
      ...(input.operationId ? {
        p_operation_id: input.operationId,
        p_scanner_user_id: authorization.staff.userId,
        p_scan_credential: input.qrValue,
      } : {}),
    }
    const { data, error } = await supabase.rpc(rpcName, rpcArgs)

    if (error || !data || typeof data !== 'object' || typeof data.success !== 'boolean') {
      return scannerJson({
        error: 'Attendance could not be confirmed. Check the scan before retrying.',
        code: 'SYSTEM_ERROR',
      }, 503)
    }

    const result = data as RpcResult
    const candidate = result.candidate
    const photoPath = candidate?.photo_storage_path

    if (candidate) {
      delete candidate.photo_storage_path
      candidate.photo_available = typeof photoPath === 'string' && photoPath.length > 0
      if (typeof photoPath === 'string' && photoPath.length > 0) {
        try {
          const { data: signedPhoto } = await supabase.storage
            .from('campaign_documents')
            .createSignedUrl(photoPath, 900)
          candidate.signedPhotoUrl = signedPhoto?.signedUrl ?? null
        } catch {
          candidate.signedPhotoUrl = null
        }
      }
    }

    return scannerJson(result)
  } catch {
    return scannerJson({
      error: 'Attendance could not be confirmed. Check the scan before retrying.',
      code: 'SYSTEM_ERROR',
    }, 503)
  }
}
