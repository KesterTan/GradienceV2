import Link from "next/link"
import { notFound } from "next/navigation"
import { format, parseISO } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCourseForGrader, listAssignmentsForCourse } from "@/lib/course-management"
import { requireGraderUser } from "@/lib/current-user"

function formatDate(value: string) {
  return format(parseISO(value), "MMM d, yyyy")
}

export default async function CourseDashboardPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const user = await requireGraderUser()
  const { courseId } = await params
  const parsedCourseId = Number(courseId)

  if (!Number.isFinite(parsedCourseId)) {
    notFound()
  }

  const [course, assignments] = await Promise.all([
    getCourseForGrader(user.id, parsedCourseId),
    listAssignmentsForCourse(user.id, parsedCourseId),
  ])

  if (!course) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Course dashboard"
        subtitle={course.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: course.title, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{course.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(course.startDate)} - {formatDate(course.endDate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Instructors: {course.instructors.join(", ") || "None"}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-end">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/courses/${course.id}/members`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 mr-1"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Members
              </Link>
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button asChild className="w-full sm:w-auto">
              <Link href={`/courses/${course.id}/assessments/new`}>Create assessment</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/courses">Back to main dashboard</Link>
              </Button>
          </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No assessments in this course</CardTitle>
              <CardDescription>Add assignments to begin collecting submissions.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardHeader>
                  <CardTitle>{assignment.title}</CardTitle>
                  <CardDescription>Due {format(new Date(assignment.dueAt), "MMM d, yyyy h:mm a")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-muted-foreground">
                    Submissions: <span className="font-medium text-foreground">{assignment.submissionCount}</span>
                  </p>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href={`/courses/${course.id}/assessments/${assignment.id}`}>
                      Open assessment page
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
