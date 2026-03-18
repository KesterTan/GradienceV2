import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAuth0Client } from "@/lib/auth0"

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico"])

export async function proxy(request: NextRequest) {
  const auth0 = createAuth0Client(request.nextUrl.origin)
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith("/api/auth")
  const isNextInternal = pathname.startsWith("/_next")
  const isPublicRoute = PUBLIC_PATHS.has(pathname)

  const authResponse = await auth0.middleware(request)

  if (isAuthRoute || isNextInternal || isPublicRoute) {
    return authResponse
  }

  const session = await auth0.getSession(request)

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return authResponse
}

export const config = {
  matcher: ["/:path*"],
}
