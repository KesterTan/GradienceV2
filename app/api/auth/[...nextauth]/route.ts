import type { NextRequest } from "next/server"
import { createAuth0Client } from "@/lib/auth0"

async function handler(request: NextRequest) {
	const auth0 = createAuth0Client(request.nextUrl.origin)
	return auth0.middleware(request)
}

export { handler as GET, handler as POST }
