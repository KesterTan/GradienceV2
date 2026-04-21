"use client"

import { useUser } from "@auth0/nextjs-auth0/client"
import { Button } from "@/components/ui/button"

function formatWelcomeName(name?: string | null, email?: string | null) {
  if (name && name.trim().length > 0) {
    return name
  }
  if (email && email.includes("@")) {
    return email.split("@")[0]
  }
  return "there"
}

export function LandingHeaderActions() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return <div className="h-10 w-40 rounded-full bg-white/70" aria-hidden="true" />
  }

  if (user) {
    const welcomeName = formatWelcomeName(user.name, user.email)

    return (
      <div className="flex items-center gap-3 text-sm font-semibold text-[#122c54]">
        <span>Welcome, {welcomeName}</span>
        <Button asChild variant="outline" className="rounded-full border-[#122c54] text-[#122c54]">
          <a href="/courses">Open app</a>
        </Button>
      </div>
    )
  }

  return (
    <Button asChild className="rounded-full bg-[#122c54] text-white hover:bg-[#0f2341]">
      <a href="/login">Sign in / Create account</a>
    </Button>
  )
}
