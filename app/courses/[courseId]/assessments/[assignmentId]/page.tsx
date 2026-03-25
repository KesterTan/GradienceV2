import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { getAssessmentForGrader, listStudentsWithLatestSubmission } from "@/lib/course-management"
import { requireGraderUser } from "@/lib/current-user"
import { AssessmentClient } from "./_components/assessment-client"

function SubmissionWindowBadge({ dueAt, lateUntil }: { dueAt: string; lateUntil: string | null }) {
  const now = new Date()
  const due = new Date(dueAt)
  const late = lateUntil ? new Date(lateUntil) : null

  if (now <= due) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Open
      </span>
    )
  }
  if (late && now <= late) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Late window
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Closed
    </span>
  )
}

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

  const [assessment, students] = await Promise.all([
    getAssessmentForGrader(user.id, parsedCourseId, parsedAssignmentId),
    listStudentsWithLatestSubmission(user.id, parsedCourseId, parsedAssignmentId),
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

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{assessment.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Course: {assessment.courseTitle}</p>
            {assessment.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Assignment Description:</span>{" "}
                {assessment.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                Due {format(new Date(assessment.dueAt), "MMM d, yyyy h:mm a")}
              </p>
              {assessment.lateUntil && (
                <p className="text-sm text-muted-foreground">
                  · Late until {format(new Date(assessment.lateUntil), "MMM d, yyyy h:mm a")}
                </p>
              )}
              <SubmissionWindowBadge dueAt={assessment.dueAt} lateUntil={assessment.lateUntil} />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/edit`}>Edit assignment</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/courses/${assessment.courseId}`}>Back to course dashboard</Link>
            </Button>
          </div>
        </div>

        <AssessmentClient
          courseId={assessment.courseId}
          assignmentId={assessment.id}
          students={students}
        />
      </section>
    </main>
  )
}
