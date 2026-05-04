"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSafeReturnTo } from "@/lib/auth-return-to"

type LoginFormProps = {
  returnTo?: string
}

function getLoginHref(connection: string, returnTo: string) {
  const params = new URLSearchParams({ connection, returnTo })
  return `/api/auth/login?${params.toString()}`
}

export function LoginForm({ returnTo = "/courses" }: LoginFormProps) {
  const safeReturnTo = getSafeReturnTo(returnTo)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your email credentials or a linked OAuth provider to access the grading platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full">
          <a href={getLoginHref("Gradience", safeReturnTo)}>Continue with Email</a>
        </Button>
        <Button asChild className="w-full" variant="outline">
          <a href={getLoginHref("google-oauth2", safeReturnTo)}>Continue with Google</a>
        </Button>
      </CardContent>
    </Card>
  )
}
