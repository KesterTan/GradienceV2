"use client"

import { useGrading } from "@/lib/grading-context"
import { ChevronLeft, GraduationCap, Home, FileText, Sparkles, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type AuthenticatedUser = {
  name?: string
  email?: string
  picture?: string
}

export function AppHeader({ user }: { user: AuthenticatedUser }) {
  const { currentPage, setPage, goBack, canGoBack, selectedStudentId, gradingComplete } = useGrading()

  const canGoToGrading = gradingComplete[selectedStudentId]
  const isOnHome = currentPage === "home"
  const initials =
    user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "U"

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center gap-2">
        <Button
          onClick={goBack}
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!canGoBack}
          aria-label="Go back"
          title="Go back"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <button
          onClick={() => setPage("home")}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex items-center justify-center rounded-lg bg-primary/10 p-1.5">
            <GraduationCap className="size-5 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Gradient
          </span>
        </button>
      </div>

      {!isOnHome && (
        <nav className="flex items-center gap-1" aria-label="Workflow steps">
          <button
            onClick={() => setPage("home")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <span className="text-muted-foreground/40 text-xs select-none">/</span>
          <button
            onClick={() => setPage("upload")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentPage === "upload"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <FileText className="size-4" />
            Submission
          </button>
          <span className="text-muted-foreground/40 text-xs select-none">/</span>
          <button
            onClick={() => setPage("rubric")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentPage === "rubric"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Sparkles className="size-4" />
            Rubric
          </button>
          <span className="text-muted-foreground/40 text-xs select-none">/</span>
          <button
            onClick={() => canGoToGrading && setPage("grading")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              currentPage === "grading"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
              !canGoToGrading && "opacity-40 cursor-not-allowed"
            )}
          >
            <BarChart3 className="size-4" />
            Grading
          </button>
        </nav>
      )}

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-none text-foreground">{user.name ?? "Signed in user"}</p>
          {user.email && <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>}
        </div>

        <Avatar>
          {user.picture && <AvatarImage src={user.picture} alt={user.name ?? "User avatar"} />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <Button asChild size="sm" variant="outline">
          <a href="/api/auth/logout">Sign out</a>
        </Button>
      </div>
    </header>
  )
}
