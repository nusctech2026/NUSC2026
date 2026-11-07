import { getScannerAuthorization } from '@/lib/scanner-auth'
import { scannerJson } from '@/lib/http'

export async function GET() {
  const authorization = await getScannerAuthorization()

  if (authorization.status === 'unauthenticated') {
    return scannerJson({ error: 'Sign in to continue.', code: 'AUTH_REQUIRED' }, 401)
  }
  if (authorization.status === 'forbidden') {
    return scannerJson({ error: 'This account is not authorized to scan workforce IDs.', code: 'SCANNER_ACCESS_DENIED' }, 403)
  }
  if (authorization.status === 'unavailable') {
    return scannerJson({ error: 'Scanner access could not be verified. Try again.', code: 'AUTH_UNAVAILABLE' }, 503)
  }

  return scannerJson({ staff: { email: authorization.staff.email } })
}
