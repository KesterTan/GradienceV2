import { createHmac, timingSafeEqual } from "node:crypto"

type AccountLinkTokenPayload = {
  current_user_id?: string
  current_email?: string
  candidate_user_id?: string
  candidate_email?: string
  exp?: number
  iat?: number
}

type Auth0Identity = {
  provider?: string
  user_id?: string
}

type Auth0User = {
  user_id: string
  email?: string
  email_verified?: boolean
  identities?: Auth0Identity[]
}

function resolveAuth0Domain() {
  const fromDomain = process.env.AUTH0_DOMAIN
  if (fromDomain) {
    return fromDomain
  }

  const issuer = process.env.AUTH0_ISSUER_BASE_URL
  if (!issuer) {
    throw new Error("Missing AUTH0_DOMAIN or AUTH0_ISSUER_BASE_URL")
  }

  const normalizedIssuer = issuer.startsWith("http") ? issuer : `https://${issuer}`
  return new URL(normalizedIssuer).host
}

function getLinkTokenSecret() {
  const secret = process.env.AUTH0_MGMT_CLIENT_SECRET
  if (!secret) {
    throw new Error("Missing AUTH0_MGMT_CLIENT_SECRET")
  }
  return secret
}

function base64urlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8")
}

function verifyActionToken(token: string): AccountLinkTokenPayload {
  const [headerSegment, payloadSegment, signatureSegment] = token.split(".")
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    throw new Error("Invalid account link token")
  }

  const secret = getLinkTokenSecret()
  const data = `${headerSegment}.${payloadSegment}`
  const expectedSignature = createHmac("sha256", secret).update(data).digest("base64url")

  const expectedBuffer = Buffer.from(expectedSignature)
  const actualBuffer = Buffer.from(signatureSegment)
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new Error("Account link token signature verification failed")
  }

  const payload = JSON.parse(base64urlDecode(payloadSegment)) as AccountLinkTokenPayload
  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new Error("Account link token expired")
  }

  return payload
}

async function getManagementToken(domain: string) {
  const clientId = process.env.AUTH0_MGMT_CLIENT_ID
  const clientSecret = process.env.AUTH0_MGMT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Missing AUTH0_MGMT_CLIENT_ID or AUTH0_MGMT_CLIENT_SECRET")
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  })

  if (!response.ok) {
    throw new Error("Unable to get Auth0 Management API token")
  }

  const body = (await response.json()) as { access_token?: string }
  if (!body.access_token) {
    throw new Error("Auth0 Management API token missing access_token")
  }

  return body.access_token
}

async function getUserById(params: { domain: string; mgmtToken: string; userId: string }) {
  const { domain, mgmtToken, userId } = params
  const encodedUserId = encodeURIComponent(userId)

  const response = await fetch(`https://${domain}/api/v2/users/${encodedUserId}`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${mgmtToken}`,
      "content-type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Unable to load Auth0 user ${userId}`)
  }

  return (await response.json()) as Auth0User
}

function choosePrimaryUser(current: Auth0User, candidate: Auth0User) {
  const currentProvider = current.identities?.[0]?.provider
  const candidateProvider = candidate.identities?.[0]?.provider
  if (currentProvider !== "auth0") return current
  if (candidateProvider !== "auth0") return candidate
  return current
}

async function linkIdentity(params: {
  domain: string
  mgmtToken: string
  primaryUserId: string
  secondaryProvider: string
  secondaryUserId: string
}) {
  const { domain, mgmtToken, primaryUserId, secondaryProvider, secondaryUserId } = params
  const encodedPrimary = encodeURIComponent(primaryUserId)

  const response = await fetch(`https://${domain}/api/v2/users/${encodedPrimary}/identities`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${mgmtToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      provider: secondaryProvider,
      user_id: secondaryUserId,
    }),
  })

  if (response.ok || response.status === 409) {
    return
  }

  throw new Error("Auth0 identity link request failed")
}

export function getAuth0ContinueUrl(state: string) {
  const domain = resolveAuth0Domain()
  const continueUrl = new URL(`https://${domain}/continue`)
  continueUrl.searchParams.set("state", state)
  return continueUrl.toString()
}

export function parseAccountLinkToken(token: string) {
  return verifyActionToken(token)
}

export async function linkAccountsFromActionToken(token: string) {
  const payload = verifyActionToken(token)
  const currentUserId = payload.current_user_id
  const candidateUserId = payload.candidate_user_id

  if (!currentUserId || !candidateUserId || currentUserId === candidateUserId) {
    throw new Error("Invalid account linking payload")
  }

  const domain = resolveAuth0Domain()
  const mgmtToken = await getManagementToken(domain)

  const current = await getUserById({ domain, mgmtToken, userId: currentUserId })
  const candidate = await getUserById({ domain, mgmtToken, userId: candidateUserId })

  const primary = choosePrimaryUser(current, candidate)
  const secondary = primary.user_id === current.user_id ? candidate : current

  const secondaryIdentity = secondary.identities?.[0]
  if (!secondaryIdentity?.provider || !secondaryIdentity?.user_id) {
    throw new Error("Secondary identity is missing provider data")
  }

  const alreadyLinked = (primary.identities ?? []).some(
    (identity) =>
      identity.provider === secondaryIdentity.provider &&
      identity.user_id === secondaryIdentity.user_id,
  )

  if (alreadyLinked) {
    return
  }

  await linkIdentity({
    domain,
    mgmtToken,
    primaryUserId: primary.user_id,
    secondaryProvider: secondaryIdentity.provider,
    secondaryUserId: secondaryIdentity.user_id,
  })
}
