import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ArrowRight, BookOpen, Calendar, Plus } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listCoursesForUser } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

function formatDate(value: string) {
  return format(parseISO(value), "MMM d, yyyy")
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default async function CoursesDashboardPage() {
  const user = await requireAppUser()
  const courses = await listCoursesForUser(user.id)

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Courses"
        subtitle="Main dashboard with all courses you can manage"
        breadcrumbs={[
          { label: "Home", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <BookOpen className="size-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Course Dashboard</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Open your enrolled courses or create a new one.</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/courses/new" className="gap-2">
              <Plus className="size-4" />
              Create Course
            </Link>
          </Button>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No courses yet</CardTitle>
              <CardDescription>Create your first course or wait to be added to one.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/courses/new">Create first course</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="border-border/90 bg-card">
                <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle>{course.title}</CardTitle>
                      <Badge className="rounded-full px-4 py-0.5 text-sm" variant="default">
                        {course.viewerRole}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="size-4" />
                        <span>{formatDate(course.startDate)} - {formatDate(course.endDate)}</span>
                      </span>
                      <span>{pluralize(course.instructors.length, "instructor", "instructors")}</span>
                      <span>{pluralize(course.studentCount, "student", "students")}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" className="h-auto px-2 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/90 sm:self-auto">
                    <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-2">
                      Open
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
