import { redirect } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import { auth0 } from "@/lib/auth0"

export default async function LoginPage() {
  const session = await auth0.getSession()

  if (session) {
    redirect("/")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <LoginForm />
    </main>
  )
}
