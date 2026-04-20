import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { AssessmentSubmissionPanel } from "@/components/assessment-submission-panel"
import { DashboardHeader } from "@/components/dashboard-header"
import { StudentSubmissionsCard } from "@/components/student-submissions-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getAssessmentForCourseMember,
  listMemberSubmissionHistory,
  listRegradeRequestsForAssignment,
  listStudentsWithoutSubmission,
  listSubmissionsForAssessment,
} from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const user = await requireAppUser()
  const { courseId, assignmentId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
    notFound()
  }

  const assessment = await getAssessmentForCourseMember(user.id, parsedCourseId, parsedAssignmentId)

  if (!assessment) {
    notFound()
  }

  const isInstructor = assessment.viewerRole === "Instructor"
  const memberHistory = await listMemberSubmissionHistory(user.id, parsedCourseId, parsedAssignmentId)
  const [submissions, nonSubmitters, regradeRequests] = await Promise.all([
    isInstructor ? listSubmissionsForAssessment(user.id, parsedCourseId, parsedAssignmentId) : Promise.resolve([]),
    isInstructor ? listStudentsWithoutSubmission(user.id, parsedCourseId, parsedAssignmentId) : Promise.resolve([]),
    isInstructor ? listRegradeRequestsForAssignment(parsedCourseId, parsedAssignmentId) : Promise.resolve([]),
  ])
  const pendingRegradeSubmissionIds = new Set(regradeRequests.map((r) => r.submissionId))

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
            <p className="mt-1 text-sm text-muted-foreground">
              Due {format(new Date(assessment.dueAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/questions`}>
                Questions
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/rubric`}>
                Rubric
              </Link>
            </Button>
            {isInstructor && <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/edit`}>Edit assignment</Link>
            </Button>}
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/courses/${assessment.courseId}`}>Back to course dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <AssessmentSubmissionPanel
            courseId={assessment.courseId}
            assignmentId={assessment.id}
            assignmentTitle={assessment.title}
            dueAt={assessment.dueAt}
            lateUntil={assessment.lateUntil}
            totalPoints={assessment.totalPoints}
            allowResubmissions={assessment.allowResubmissions}
            maxAttemptResubmission={assessment.maxAttemptResubmission}
            history={memberHistory}
            isInstructor={isInstructor}
          />
        </div>

        {isInstructor && (() => {
          const studentMap = new Map<number, typeof submissions>()
          for (const s of submissions) {
            const group = studentMap.get(s.studentMembershipId) ?? []
            group.push(s)
            studentMap.set(s.studentMembershipId, group)
          }
          const students = Array.from(studentMap.values()).sort((a, b) => {
            const aHas = a.some((s) => pendingRegradeSubmissionIds.has(s.id))
            const bHas = b.some((s) => pendingRegradeSubmissionIds.has(s.id))
            if (aHas && !bHas) return -1
            if (!aHas && bHas) return 1
            return a[0].studentName.localeCompare(b[0].studentName)
          })
          const hasAny = students.length > 0 || nonSubmitters.length > 0

          return !hasAny ? (
            <Card>
              <CardHeader>
                <CardTitle>No student submissions yet</CardTitle>
                <CardDescription>Student submissions for this assessment will appear here.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              <h3 className="text-base font-semibold text-foreground">Student submissions</h3>
              {students.map((versions) => (
                <StudentSubmissionsCard
                  key={versions[0].studentMembershipId}
                  courseId={assessment.courseId}
                  assignmentId={assessment.id}
                  versions={versions}
                  hasPendingRegrade={versions.some((s) => pendingRegradeSubmissionIds.has(s.id))}
                />
              ))}
              {nonSubmitters.map((student) => (
                <Card key={student.studentMembershipId}>
                  <CardHeader className="pb-3">
                    <CardTitle>{student.studentName}</CardTitle>
                    <CardDescription>{student.studentEmail}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 sm:px-6">
                    <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">No submission</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        })()}
      </section>
    </main>
  )
}
