import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createAuth0Client } from "@/lib/auth0"

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/favicon.ico",
  "/icon.svg",
  "/icon-light-32x32.png",
  "/icon-dark-32x32.png",
  "/apple-icon.png",
])

function isPublicAsset(pathname: string) {
  return pathname.startsWith("/_next") || pathname === "/landing" || pathname.startsWith("/landing/")
}

export async function proxy(request: NextRequest) {
  const auth0 = createAuth0Client(request.nextUrl.origin)
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith("/api/auth")
  const isPublicRoute = PUBLIC_PATHS.has(pathname) || pathname.startsWith("/login")

  if (isAuthRoute) {
    return auth0.middleware(request)
  }

  if (isPublicRoute || isPublicAsset(pathname)) {
    return NextResponse.next()
  }

  const authResponse = await auth0.middleware(request)

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
