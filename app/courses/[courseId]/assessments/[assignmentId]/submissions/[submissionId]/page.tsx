import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSubmissionGradeForGrader } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"
import { InstructorReleaseButton } from "@/components/instructor-release-button"
import { SubmissionGradeForm } from "./_components/submission-grade-form"

export default async function SubmissionPage({
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

  const submission = await getSubmissionGradeForGrader(
    user.id,
    parsedCourseId,
    parsedAssignmentId,
    parsedSubmissionId,
  )

  if (!submission) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Submission"
        subtitle={`${submission.studentName} · ${submission.assignmentTitle}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: submission.courseTitle, href: `/courses/${submission.courseId}` },
          { label: submission.assignmentTitle, href: `/courses/${submission.courseId}/assessments/${submission.assignmentId}` },
          { label: submission.studentName, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{submission.studentName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{submission.studentEmail}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")} · Attempt {submission.attemptNumber}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/courses/${submission.courseId}/assessments/${submission.assignmentId}`}>
              Back to assessment page
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-6">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Submitted PDF</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.fileUrl ? (
                  <div className="overflow-hidden rounded-md border bg-muted/20">
                    <iframe
                      src={`/api/courses/${submission.courseId}/assessments/${submission.assignmentId}/submissions/${submission.id}/file`}
                      title="Submitted PDF"
                      className="h-[70vh] w-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-md border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">
                      No PDF file was submitted for this attempt.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student answer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[320px] overflow-y-auto rounded-md border bg-muted/20 p-4">
                  {submission.textContent ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {submission.textContent}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No inline text content was provided for this submission.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Course:</span> {submission.courseTitle}</p>
                <p><span className="text-muted-foreground">Assessment:</span> {submission.assignmentTitle}</p>
                <p><span className="text-muted-foreground">Status:</span> {submission.status}</p>
                {submission.grade && (
                  <p>
                    <span className="text-muted-foreground">Saved grade:</span> {submission.grade.totalScore}/{submission.totalPoints}
                  </p>
                )}
                <div className="pt-1">
                  <InstructorReleaseButton
                    courseId={submission.courseId}
                    assignmentId={submission.assignmentId}
                    submissionId={submission.id}
                    isReleased={submission.grade?.isReleasedToStudent ?? false}
                  />
                </div>
                {submission.fileUrl && (
                  <p>
                    <span className="text-muted-foreground">File:</span>{" "}
                    <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      Open submitted file
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
            {submission.rubricQuestions.length > 0 ? (
              <SubmissionGradeForm
                courseId={submission.courseId}
                assignmentId={submission.assignmentId}
                submissionId={submission.id}
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
                  Save a rubric for this assessment before grading submissions.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
