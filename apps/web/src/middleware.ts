import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@nusc/db/src/client/middleware';

export async function middleware(request: NextRequest) {
  // The callback exchanges its PKCE code, and the reset page verifies the
  // resulting session itself. Avoid a redundant shared auth request before
  // either recovery handler runs.
  if (
    request.nextUrl.pathname === '/auth/recovery' ||
    request.nextUrl.pathname === '/reset-password'
  ) {
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
