import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { auth0 } from "@/lib/auth0"
import { getSafeReturnTo } from "@/lib/auth-return-to"

type SearchParams = Record<string, string | string[] | undefined>

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams
}) {
  const resolvedParams = await Promise.resolve(searchParams)
  const requestedReturnTo = resolvedParams.returnTo
  const loginReturnTo = getSafeReturnTo(requestedReturnTo)
  const authenticatedReturnTo = getSafeReturnTo(requestedReturnTo, { defaultPath: "/" })
  const session = await auth0.getSession()

  if (session) {
    redirect(authenticatedReturnTo)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <LoginForm returnTo={loginReturnTo} />
    </main>
  )
}
