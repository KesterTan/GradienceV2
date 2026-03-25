import { redirect } from "next/navigation"
import { auth0 } from "@/lib/auth0"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db/orm"
import { users } from "@/db/schema"

export type AppUser = {
  id: number
  firstName: string
  lastName: string
  email: string
}

function splitName(name?: string | null, email?: string | null) {
  const safeName = name?.trim()
  if (safeName) {
    const parts = safeName.split(/\s+/)
    const firstName = parts[0] ?? "User"
    const lastName = parts.slice(1).join(" ") || "Account"
    return { firstName, lastName }
  }

  const prefix = email?.split("@")[0] ?? "user"
  return {
    firstName: prefix.slice(0, 1).toUpperCase() + prefix.slice(1),
    lastName: "Account",
  }
}

async function findUser(authProviderId?: string | null, email?: string | null) {
  if (authProviderId) {
    const byProvider = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        authProviderId: users.authProviderId,
      })
      .from(users)
      .where(eq(users.authProviderId, authProviderId))
      .limit(1)

    if (byProvider[0]) {
      return byProvider[0]
    }
  }

  if (email) {
    const byEmail = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        authProviderId: users.authProviderId,
      })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1)

    if (byEmail[0]) {
      return byEmail[0]
    }
  }

  return null
}

async function ensureUserRecord(params: {
  authProviderId?: string | null
  email?: string | null
  name?: string | null
}) {
  const { authProviderId, email, name } = params

  // try to find user in auth0 by authprovider or email
  // this prevents duplicates
  const existing = await findUser(authProviderId, email)
  if (existing) {
    // if user is found but does not have auth provider id, we update it
    if (authProviderId && !existing.authProviderId) {
      await db
        .update(users)
        .set({ authProviderId, status: "active" })
        .where(eq(users.id, existing.id))
    }

    return existing
  }

  const normalizedEmail = email ?? `${authProviderId ?? "user"}@auth.local`
  const { firstName, lastName } = splitName(name, normalizedEmail)

  const inserted = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash: "auth0-managed",
      authProviderId: authProviderId ?? null,
      status: "active",
    })
    .returning({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      authProviderId: users.authProviderId,
    })

  return inserted[0]
}

export async function requireAppUser(): Promise<AppUser> {
  const session = await auth0.getSession()
  if (!session) {
    redirect("/login")
  }

  const authProviderId = session.user.sub ?? null
  const email = session.user.email ?? null
  const name = session.user.name ?? null

  const user = await ensureUserRecord({ authProviderId, email, name })

  return {
    id: Number(user.id),
    firstName: String(user.firstName),
    lastName: String(user.lastName),
    email: String(user.email),
  }
}

export async function requireGraderUser(): Promise<AppUser> {
  return requireAppUser()
}
