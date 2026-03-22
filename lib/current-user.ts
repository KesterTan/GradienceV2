import { redirect } from "next/navigation"
import { query } from "@/db/db"
import { auth0 } from "@/lib/auth0"

export type AppUser = {
  id: number
  firstName: string
  lastName: string
  email: string
  globalRole: "grader" | "student"
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
    const byProvider = await query(
      `SELECT id, first_name, last_name, email, global_role, auth_provider_id
       FROM gradience.users
       WHERE auth_provider_id = $1
       LIMIT 1`,
      [authProviderId],
    )
    if (byProvider.rows[0]) {
      return byProvider.rows[0]
    }
  }

  if (email) {
    const byEmail = await query(
      `SELECT id, first_name, last_name, email, global_role, auth_provider_id
       FROM gradience.users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email],
    )
    if (byEmail.rows[0]) {
      return byEmail.rows[0]
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
    if (authProviderId && !existing.auth_provider_id) {
      await query(
        `UPDATE gradience.users
         SET auth_provider_id = $1, status = 'active'
         WHERE id = $2`,
        [authProviderId, existing.id],
      )
    }

    return existing
  }

  const normalizedEmail = email ?? `${authProviderId ?? "user"}@auth.local`
  const { firstName, lastName } = splitName(name, normalizedEmail)

  const inserted = await query(
    `INSERT INTO gradience.users (
       first_name,
       last_name,
       email,
       password_hash,
       auth_provider_id,
       global_role,
       status
     )
     VALUES ($1, $2, $3, $4, $5, 'grader', 'active')
     RETURNING id, first_name, last_name, email, global_role, auth_provider_id`,
    [firstName, lastName, normalizedEmail, "auth0-managed", authProviderId ?? null],
  )

  return inserted.rows[0]
}

export async function requireAppUser(): Promise<AppUser> {
  const session = await auth0.getSession()
  if (!session) {
    redirect("/login")
  }

  const authProviderId = session.user.sub ?? null
  const email = session.user.email ?? null
  const name = session.user.name ?? null

  console.log("Session info: ", { authProviderId, email, name })

  const user = await ensureUserRecord({ authProviderId, email, name })

  return {
    id: Number(user.id),
    firstName: String(user.first_name),
    lastName: String(user.last_name),
    email: String(user.email),
    globalRole: user.global_role as "grader" | "student",
  }
}

export async function requireGraderUser(): Promise<AppUser> {
  const user = await requireAppUser()
  if (user.globalRole !== "grader") {
    redirect("/login?error=unauthorized")
  }
  return user
}
