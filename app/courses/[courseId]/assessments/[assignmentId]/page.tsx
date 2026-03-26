import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PdfUploadForm } from "@/components/pdf-upload-form"
import { RestoreButton } from "@/components/restore-button"
import {
  getAssessmentForCourseMember,
  listStudentSubmissionsForAssignment,
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
  const [submissions, studentSubmissions] = await Promise.all([
    isInstructor
      ? listSubmissionsForAssessment(user.id, parsedCourseId, parsedAssignmentId)
      : Promise.resolve([]),
    !isInstructor
      ? listStudentSubmissionsForAssignment(user.id, parsedCourseId, parsedAssignmentId)
      : Promise.resolve([]),
  ])

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
            {isInstructor && <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/edit`}>Edit assignment</Link>
            </Button>}
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={`/courses/${assessment.courseId}`}>Back to course dashboard</Link>
            </Button>
          </div>
        </div>

        {isInstructor && (submissions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No submissions yet</CardTitle>
              <CardDescription>Student submissions for this assessment will appear here.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card key={submission.studentMembershipId}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle>{submission.studentName}</CardTitle>
                    <CardDescription>{submission.studentEmail}</CardDescription>
                  </div>
                  <Badge>Active — Version {submission.attemptNumber}</Badge>
                </CardHeader>
                <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted: <span className="font-medium text-foreground">{format(new Date(submission.submittedAt), "MMM d, yyyy h:mm a")}</span></p>
                    <p className="text-sm text-muted-foreground">Status: <span className="font-medium text-foreground">{submission.status}</span></p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/submissions/${submission.id}`}>
                        Open active submission
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/students/${submission.studentMembershipId}`}>
                        View all versions
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

        {!isInstructor && (
          <div className="grid gap-4">
            <PdfUploadForm courseId={assessment.courseId} assignmentId={assessment.id} dueAt={assessment.dueAt} />

            {studentSubmissions.length > 0 && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground">Your submissions</h3>
                {studentSubmissions.map((sub, index) => {
                  const isActive = index === 0
                  const isPastDeadline = new Date() > new Date(assessment.dueAt)
                  return (
                    <Card key={sub.id}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-base">Version {sub.attemptNumber}</CardTitle>
                        {isActive && <Badge>Active</Badge>}
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Submitted:{" "}
                            <span className="font-medium text-foreground">
                              {format(new Date(sub.submittedAt), "MMM d, yyyy h:mm a")}
                            </span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: <span className="font-medium text-foreground">{sub.status}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {sub.fileUrl && (
                            <Button asChild variant="outline" size="sm">
                              <a href={sub.fileUrl} target="_blank" rel="noreferrer">View file</a>
                            </Button>
                          )}
                          {!isActive && !isPastDeadline && (
                            <RestoreButton
                              courseId={assessment.courseId}
                              assignmentId={assessment.id}
                              submissionId={sub.id}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
