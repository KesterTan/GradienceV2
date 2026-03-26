import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight, Calendar } from "lucide-react"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStudentMembership } from "@/lib/current-user"
import { getCourseForStudent, listAssignmentsForStudent, StudentAssignmentSummary } from "@/lib/student-queries"

const STATUS_VARIANT: Record<StudentAssignmentSummary["submissionStatus"], "default" | "secondary" | "destructive" | "outline"> = {
  not_submitted: "secondary",
  submitted: "default",
  late: "outline",
  resubmitted: "default",
  graded: "default",
}

const STATUS_LABEL: Record<StudentAssignmentSummary["submissionStatus"], string> = {
  not_submitted: "Not submitted",
  submitted: "Submitted",
  late: "Late",
  resubmitted: "Resubmitted",
  graded: "Graded",
}

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const parsedCourseId = Number(courseId)

  if (!Number.isFinite(parsedCourseId)) notFound()

  const { user } = await requireStudentMembership(parsedCourseId)

  const [course, assignments] = await Promise.all([
    getCourseForStudent(user.id, parsedCourseId),
    listAssignmentsForStudent(user.id, parsedCourseId),
  ])

  if (!course) notFound()

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title={course.title}
        breadcrumbs={[
          { label: "Home", href: "/student/courses" },
          { label: course.title, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">{course.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {course.courseCode}{course.term ? ` · ${course.term}` : ""}
            {course.instructors.length > 0 && (
              <> · Instructor{course.instructors.length > 1 ? "s" : ""}: {course.instructors.join(", ")}</>
            )}
          </p>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No assignments yet</CardTitle>
              <CardDescription>No assignments have been published yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => {
              const isOverdue =
                assignment.submissionStatus === "not_submitted" &&
                new Date() > new Date(assignment.dueAt)

              return (
                <Card key={assignment.id} className="border-border/90 bg-card">
                  <CardContent className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <CardTitle>{assignment.title}</CardTitle>
                        <Badge variant={STATUS_VARIANT[assignment.submissionStatus]} className="rounded-full px-3 py-0.5 text-xs">
                          {STATUS_LABEL[assignment.submissionStatus]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="size-4" />
                          Due {format(new Date(assignment.dueAt), "MMM d, yyyy")}
                          {isOverdue && (
                            <span className="ml-1 font-medium text-amber-600">· Past due</span>
                          )}
                        </span>
                        <span>{assignment.totalPoints} pts</span>
                        {assignment.latestAttemptNumber !== null && (
                          <span>Version {assignment.latestAttemptNumber}</span>
                        )}
                      </div>
                    </div>
                    <Button asChild variant="ghost" className="h-auto px-2 text-sm font-medium text-primary hover:bg-transparent hover:text-primary/90 sm:self-auto">
                      <Link href={`/student/courses/${parsedCourseId}/assignments/${assignment.id}`} className="inline-flex items-center gap-2">
                        Open
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
