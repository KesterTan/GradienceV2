import { Auth0Client } from "@auth0/nextjs-auth0/server"
import { NextResponse } from "next/server"

function resolveAuth0Domain() {
	const fromDomain = process.env.AUTH0_DOMAIN
	if (fromDomain) {
		return fromDomain
	}

	const issuer = process.env.AUTH0_ISSUER_BASE_URL
	if (!issuer) {
		return undefined
	}

	const normalizedIssuer = issuer.startsWith("http") ? issuer : `https://${issuer}`
	return new URL(normalizedIssuer).host
}

function resolveAppBaseUrl(explicitAppBaseUrl?: string) {
	if (explicitAppBaseUrl) {
		return explicitAppBaseUrl
	}

	if (process.env.APP_BASE_URL) {
		return process.env.APP_BASE_URL
	}

	if (process.env.AUTH0_BASE_URL) {
		return process.env.AUTH0_BASE_URL
	}

	if (process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`
	}

	return undefined
}

export function createAuth0Client(appBaseUrl?: string) {
	return new Auth0Client({
		domain: resolveAuth0Domain(),
		appBaseUrl: resolveAppBaseUrl(appBaseUrl),
		clientId: process.env.AUTH0_CLIENT_ID,
		clientSecret: process.env.AUTH0_CLIENT_SECRET,
		secret: process.env.AUTH0_SECRET,
		enableParallelTransactions: false,
		onCallback: async (error, context) => {
			if (error) {
				const destination = new URL("/login", resolveAppBaseUrl(appBaseUrl) ?? "http://localhost:3000")
				destination.searchParams.set("error", "auth_callback")
				return NextResponse.redirect(destination)
			}

			return NextResponse.redirect(
				new URL(context.returnTo || "/", resolveAppBaseUrl(appBaseUrl) ?? "http://localhost:3000")
			)
		},
		routes: {
			login: "/api/auth/login",
			logout: "/api/auth/logout",
			callback: "/api/auth/callback",
		},
	})
}

export const auth0 = createAuth0Client()
