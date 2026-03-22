import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getAssessmentForGrader, listSubmissionsForAssessment } from "@/lib/course-management"
import { requireGraderUser } from "@/lib/current-user"

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const user = await requireGraderUser()
  const { courseId, assignmentId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
    notFound()
  }

  const [assessment, submissions] = await Promise.all([
    getAssessmentForGrader(user.id, parsedCourseId, parsedAssignmentId),
    listSubmissionsForAssessment(user.id, parsedCourseId, parsedAssignmentId),
  ])

  if (!assessment) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Assessment page"
        subtitle={assessment.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: assessment.courseTitle, href: `/courses/${assessment.courseId}` },
          { label: assessment.title, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{assessment.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Course: {assessment.courseTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Due {format(new Date(assessment.dueAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/courses/${assessment.courseId}`}>Back to course dashboard</Link>
          </Button>
        </div>

        {submissions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No submissions yet</CardTitle>
              <CardDescription>Student submissions for this assessment will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <CardTitle>{submission.studentName}</CardTitle>
                  <CardDescription>{submission.studentEmail}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{submission.status}</span></p>
                    <p className="text-sm text-muted-foreground">Attempt: <span className="font-medium text-foreground">{submission.attemptNumber}</span></p>
                    <p className="text-sm text-muted-foreground">Submitted: <span className="font-medium text-foreground">{format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}</span></p>
                  </div>
                  <Button asChild>
                    <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/submissions/${submission.id}`}>
                      Open submission
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
