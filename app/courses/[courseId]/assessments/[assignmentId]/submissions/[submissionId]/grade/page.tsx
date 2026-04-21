import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSubmissionGradeForStudent } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"
import { RegradeRequestCard } from "./_components/regrade-request-card"

export default async function StudentSubmissionGradePage({
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

  const submission = await getSubmissionGradeForStudent(
    user.id,
    parsedCourseId,
    parsedAssignmentId,
    parsedSubmissionId,
  )

  if (!submission) {
    notFound()
  }

  const scoreByOrder = new Map<number, number>()
  const commentByOrder = new Map<number, string>()
  for (const score of submission.grade?.rubricScores ?? []) {
    scoreByOrder.set(score.displayOrder - 1, score.pointsAwarded)
    if (score.comment && score.comment.trim().length > 0) {
      commentByOrder.set(score.displayOrder - 1, score.comment)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="My grade"
        subtitle={`${submission.assignmentTitle} · Attempt ${submission.attemptNumber}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: submission.courseTitle, href: `/courses/${submission.courseId}` },
          {
            label: submission.assignmentTitle,
            href: `/courses/${submission.courseId}/assessments/${submission.assignmentId}`,
          },
          { label: "My grade", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{submission.assignmentTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/courses/${submission.courseId}/assessments/${submission.assignmentId}`}>
              Back to assessment page
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] lg:gap-6">
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
          </div>

          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle>Total score</CardTitle>
                {submission.grade?.gradedAt && (
                  <CardDescription>
                    Last graded {format(new Date(submission.grade.gradedAt), "MMM d, yyyy h:mm a")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {submission.grade ? (
                  <p className="text-2xl font-bold text-foreground">
                    {submission.grade.totalScore} / {submission.totalPoints}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This submission has not been graded yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rubric breakdown</CardTitle>
                <CardDescription>
                  Scores are shown per rubric criterion for this submission.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission.rubricQuestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rubric has been saved for this assessment yet.</p>
                ) : (
                  submission.rubricQuestions.map((question) => {
                    const questionEarned = question.rubricItems.reduce(
                      (sum, item) => sum + (scoreByOrder.get(item.order) ?? 0),
                      0,
                    )

                    return (
                      <div key={question.questionId} className="rounded-lg border">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{question.questionId}</p>
                            <p className="text-sm text-muted-foreground">{question.questionName}</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {questionEarned} / {question.maxScore}
                          </p>
                        </div>

                        <div className="space-y-3 p-4">
                          {question.rubricItems.map((item) => {
                            const itemScore = scoreByOrder.get(item.order) ?? 0
                            const itemComment = commentByOrder.get(item.order) ?? null

                            return (
                              <div key={`${question.questionId}-${item.order}`} className="space-y-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{item.criterion}</p>
                                    <p className="text-xs text-muted-foreground">{item.rubricName}</p>
                                  </div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {itemScore} / {item.maxScore}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {itemComment ?? "No rubric-item feedback provided."}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instructor feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {submission.grade?.overallFeedback ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {submission.grade.overallFeedback}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No overall feedback has been provided yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {submission.grade && (
              <RegradeRequestCard
                courseId={submission.courseId}
                assignmentId={submission.assignmentId}
                submissionId={submission.id}
                existingRequest={submission.regradeRequest}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}