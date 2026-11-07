import { NextResponse } from 'next/server'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

export function scannerJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStoreHeaders })
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}
