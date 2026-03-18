"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
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
          <a href="/api/auth/login?connection=Gradience&returnTo=/">Continue with Email</a>
        </Button>
        <Button asChild className="w-full" variant="outline">
          <a href="/api/auth/login?connection=google-oauth2&returnTo=/">Continue with Google</a>
        </Button>
      </CardContent>
    </Card>
  )
}
