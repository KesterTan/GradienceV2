import Link from "next/link"
import { format, parseISO } from "date-fns"
import { ArrowRight, BookOpen, Calendar } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireAppUser } from "@/lib/current-user"
import { listCoursesForStudent } from "@/lib/student-queries"

function formatDate(value: string) {
  return format(parseISO(value), "MMM d, yyyy")
}

export default async function StudentCoursesPage() {
  const user = await requireAppUser()
  const courses = await listCoursesForStudent(user.id)

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="My Courses"
        breadcrumbs={[{ label: "Home", current: true }]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <BookOpen className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">My Courses</h2>
            <p className="mt-1 text-sm text-muted-foreground">View your enrolled courses and submit assignments.</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No courses yet</CardTitle>
              <CardDescription>You are not enrolled in any courses yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {courses.map((course) => (
              <Card key={course.id} className="border-border/90 bg-card">
                <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <CardTitle>{course.courseCode ? `${course.courseCode} - ` : ""}{course.title}</CardTitle>
                      <Badge className="rounded-full px-4 py-0.5 text-sm" variant="default">
                        Student
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Calendar className="size-4" />
                        <span>{formatDate(course.startDate)} - {formatDate(course.endDate)}</span>
                      </span>
                      <span>{course.instructorCount} instructor{course.instructorCount !== 1 ? "s" : ""}</span>
                      <span>{course.assignmentCount} assignment{course.assignmentCount !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" className="h-auto px-2 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/90 sm:self-auto">
                    <Link href={`/student/courses/${course.id}`} className="inline-flex items-center gap-2">
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
