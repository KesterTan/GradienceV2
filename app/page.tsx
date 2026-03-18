import { redirect } from "next/navigation"
import { ProtectedAppShell } from "@/components/protected-app-shell"
import { auth0 } from "@/lib/auth0"

export default async function Home() {
  const session = await auth0.getSession()

  if (!session) {
    redirect("/login")
  }

  return <ProtectedAppShell user={session.user} />
}
