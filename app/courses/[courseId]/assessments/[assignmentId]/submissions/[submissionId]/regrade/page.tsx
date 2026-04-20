import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExistingRegradeRequest, getSubmissionGradeForGrader } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"
import { RegradeResolveForm } from "./_components/regrade-resolve-form"

export default async function RegradeResolutionPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string; submissionId: string }>
}) {
  const user = await requireAppUser()
  const { courseId, assignmentId, submissionId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)
  const parsedSubmissionId = Number(submissionId)

  if (
    !Number.isFinite(parsedCourseId) ||
    !Number.isFinite(parsedAssignmentId) ||
    !Number.isFinite(parsedSubmissionId)
  ) {
    notFound()
  }

  const [submission, regradeRequest] = await Promise.all([
    getSubmissionGradeForGrader(user.id, parsedCourseId, parsedAssignmentId, parsedSubmissionId),
    getExistingRegradeRequest(parsedSubmissionId),
  ])

  if (!submission || !regradeRequest || regradeRequest.status !== "pending") {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Review regrade request"
        subtitle={`${submission.studentName} · ${submission.assignmentTitle}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: submission.courseTitle, href: `/courses/${submission.courseId}` },
          { label: submission.assignmentTitle, href: `/courses/${submission.courseId}/assessments/${submission.assignmentId}` },
          { label: submission.studentName, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student&apos;s regrade reason</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Submitted {format(new Date(regradeRequest.createdAt), "MMM d, yyyy h:mm a")} by {submission.studentName}
              </p>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">{regradeRequest.reason}</p>
            </CardContent>
          </Card>

          {submission.rubricQuestions.length > 0 ? (
            <RegradeResolveForm
              courseId={submission.courseId}
              assignmentId={submission.assignmentId}
              submissionId={submission.id}
              regradeRequestId={regradeRequest.id}
              totalPoints={submission.totalPoints}
              rubricQuestions={submission.rubricQuestions}
              initialGrade={submission.grade}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Grading unavailable</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Save a rubric for this assessment before resolving the regrade.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  )
}
