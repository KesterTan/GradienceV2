import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InstructorRestoreButton } from "@/components/instructor-restore-button"
import { getAssessmentForCourseMember, listSubmissionsForAssessment } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

export default async function StudentVersionsPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string; studentMembershipId: string }>
}) {
  const user = await requireAppUser()
  const { courseId, assignmentId, studentMembershipId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)
  const parsedStudentMembershipId = Number(studentMembershipId)

  if (
    !Number.isFinite(parsedCourseId) ||
    !Number.isFinite(parsedAssignmentId) ||
    !Number.isFinite(parsedStudentMembershipId)
  ) {
    notFound()
  }

  const [assessment, allSubmissions] = await Promise.all([
    getAssessmentForCourseMember(user.id, parsedCourseId, parsedAssignmentId),
    listSubmissionsForAssessment(user.id, parsedCourseId, parsedAssignmentId),
  ])

  if (!assessment || assessment.viewerRole !== "Instructor") {
    notFound()
  }

  const versions = allSubmissions
    .filter((s) => s.studentMembershipId === parsedStudentMembershipId)
    .sort((a, b) => b.attemptNumber - a.attemptNumber)

  if (versions.length === 0) {
    notFound()
  }

  const result = {
    studentName: versions[0].studentName,
    studentEmail: versions[0].studentEmail,
    versions,
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Submission versions"
        subtitle={`${result.studentName} · ${assessment.title}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: assessment.courseTitle, href: `/courses/${assessment.courseId}` },
          { label: assessment.title, href: `/courses/${assessment.courseId}/assessments/${assessment.id}` },
          { label: result.studentName, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{result.studentName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{result.studentEmail}</p>
            <p className="mt-1 text-sm text-muted-foreground">{result.versions.length} version{result.versions.length !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}`}>
              Back to assessment
            </Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {result.versions.map((version, index) => {
            const isActive = index === 0
            return (
              <Card key={version.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Version {version.attemptNumber}</CardTitle>
                  {isActive && <Badge>Active</Badge>}
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Submitted:{" "}
                      <span className="font-medium text-foreground">
                        {format(new Date(version.submittedAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="font-medium text-foreground">{version.status}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {version.fileUrl && (
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/api/courses/${assessment.courseId}/assessments/${assessment.id}/submissions/${version.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View PDF
                        </Link>
                      </Button>
                    )}
                    {!isActive && (
                      <InstructorRestoreButton
                        courseId={assessment.courseId}
                        assignmentId={assessment.id}
                        submissionId={version.id}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
