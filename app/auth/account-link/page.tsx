import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAuth0ContinueUrl, linkAccountsFromActionToken, parseAccountLinkToken } from "@/lib/auth0-account-linking"

async function continueWithoutLinkAction(formData: FormData) {
  "use server"

  const state = String(formData.get("state") ?? "").trim()
  if (!state) {
    redirect("/login?error=missing_state")
  }

  redirect(getAuth0ContinueUrl(state))
}

async function confirmLinkAndContinueAction(formData: FormData) {
  "use server"

  const state = String(formData.get("state") ?? "").trim()
  const token = String(formData.get("account_link_token") ?? "").trim()

  if (!state) {
    redirect("/login?error=missing_state")
  }

  if (!token) {
    redirect(`/auth/account-link?state=${encodeURIComponent(state)}&error=missing_token`)
  }

  try {
    await linkAccountsFromActionToken(token)
    redirect(getAuth0ContinueUrl(state))
  } catch {
    const destination = new URL("/auth/account-link", "http://localhost")
    destination.searchParams.set("state", state)
    destination.searchParams.set("account_link_token", token)
    destination.searchParams.set("error", "link_failed")
    redirect(destination.pathname + destination.search)
  }
}

type SearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AccountLinkPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams
}) {
  const resolvedParams = await Promise.resolve(searchParams)

  const state = (firstValue(resolvedParams.state) ?? "").trim()
  const token = (firstValue(resolvedParams.account_link_token) ?? "").trim()
  const error = (firstValue(resolvedParams.error) ?? "").trim()

  let currentEmail = ""
  let candidateEmail = ""
  let tokenInvalid = false

  if (token) {
    try {
      const payload = parseAccountLinkToken(token)
      currentEmail = payload.current_email ?? ""
      candidateEmail = payload.candidate_email ?? ""
    } catch {
      tokenInvalid = true
    }
  }

  const hasRequiredParams = Boolean(state) && Boolean(token) && !tokenInvalid

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Confirm account linking</CardTitle>
          <CardDescription>
            We found another sign-in method with the same email. Link both identities to use a single account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "link_failed" && (
            <p className="text-sm text-destructive">
              We couldn&apos;t link the accounts automatically. You can continue login and retry later.
            </p>
          )}

          {!state && (
            <p className="text-sm text-destructive">Missing login state. Restart sign-in from the login page.</p>
          )}

          {tokenInvalid && (
            <p className="text-sm text-destructive">Invalid or expired account linking token. Restart sign-in.</p>
          )}

          {hasRequiredParams && (
            <div className="rounded-md border bg-background p-3 text-sm">
              <p>
                <span className="font-medium">Current sign-in:</span> {currentEmail || "Unknown"}
              </p>
              <p>
                <span className="font-medium">Existing account:</span> {candidateEmail || "Unknown"}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {hasRequiredParams ? (
              <form action={confirmLinkAndContinueAction}>
                <input type="hidden" name="state" value={state} />
                <input type="hidden" name="account_link_token" value={token} />
                <Button className="w-full" type="submit">
                  Link and continue
                </Button>
              </form>
            ) : null}

            {state ? (
              <form action={continueWithoutLinkAction}>
                <input type="hidden" name="state" value={state} />
                <Button className="w-full" type="submit" variant="outline">
                  Continue without linking
                </Button>
              </form>
            ) : (
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">Back to login</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
