import 'server-only'

import { getScannerAuthorization } from '@/lib/scanner-auth'
import { scannerJson } from '@/lib/http'

export async function GET() {
  const authorization = await getScannerAuthorization()
  if (authorization.status === 'unauthenticated') {
    return scannerJson({ reachable: false, code: 'AUTH_REQUIRED' }, 401)
  }
  if (authorization.status === 'forbidden') {
    return scannerJson({ reachable: false, code: 'SCANNER_ACCESS_DENIED' }, 403)
  }
  if (authorization.status === 'unavailable') {
    return scannerJson({ reachable: false, code: 'AUTH_UNAVAILABLE' }, 503)
  }
  return scannerJson({ reachable: true, staffUserId: authorization.staff.userId, checkedAt: new Date().toISOString() })
}
