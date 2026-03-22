import Link from "next/link"
import { GraduationCap, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type BreadcrumbItem = {
  label: string
  href?: string
  current?: boolean
}

type DashboardHeaderProps = {
  title: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  user: {
    name: string
    email: string
  }
  showCoursesLink?: boolean
}

export function DashboardHeader({
  title,
  subtitle,
  breadcrumbs,
  user,
  showCoursesLink = true,
}: DashboardHeaderProps) {
  const hasBreadcrumbs = !!breadcrumbs?.length
  const homeIsActive = breadcrumbs?.[0]?.current === true

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex min-w-0 items-center gap-10">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="rounded-md p-1">
              <GraduationCap className="size-6 text-primary" />
            </div>
            <span className="truncate text-lg font-semibold tracking-tight text-foreground">Gradient</span>
          </Link>

          {hasBreadcrumbs ? (
            <nav className="flex min-w-0 items-center gap-2 text-base" aria-label="Breadcrumb">
              <Home className={cn("size-3 shrink-0", homeIsActive ? "text-primary" : "text-muted-foreground")} />
              {breadcrumbs?.map((item, index) => (
                <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  {item.href && !item.current ? (
                    <Link href={item.href} className="text-sm truncate text-muted-foreground hover:text-foreground">
                      {item.label}
                    </Link>
                  ) : (
                    <span className={cn("text-sm truncate", item.current ? "text-primary font-semibold" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          ) : (
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
        </div>

        {!hasBreadcrumbs && (
          <div className="flex items-center gap-2">
            {showCoursesLink && (
              <Button asChild variant="outline" size="sm">
                <Link href="/courses">Courses</Link>
              </Button>
            )}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/api/auth/logout">Sign out</a>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
