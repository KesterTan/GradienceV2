import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCourseForGrader, listAssignmentsForCourse } from "@/lib/course-management"
import { requireGraderUser } from "@/lib/current-user"

function formatDate(value: string) {
  return format(new Date(value), "MMM d, yyyy")
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

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{course.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDate(course.startDate)} - {formatDate(course.endDate)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Instructors: {course.instructors.join(", ") || "None"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/courses">Back to main dashboard</Link>
          </Button>
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
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Submissions: <span className="font-medium text-foreground">{assignment.submissionCount}</span>
                  </p>
                  <Button asChild>
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
