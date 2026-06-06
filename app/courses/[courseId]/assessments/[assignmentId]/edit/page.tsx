import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { toDateValuePittsburgh, toTimeValuePittsburgh } from "@/lib/format-date"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditAssignmentForm } from "./_components/edit-assignment-form"
import { getAssessmentForGrader } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"



export default async function EditAssessmentPage({
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

  const assessment = await getAssessmentForGrader(user.id, parsedCourseId, parsedAssignmentId)
  if (!assessment) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Edit assignment"
        subtitle={assessment.title}
        breadcrumbs={[
          { label: "Home", href: "/courses" },
          { label: assessment.courseTitle, href: `/courses/${assessment.courseId}` },
          { label: assessment.title, href: `/courses/${assessment.courseId}/assessments/${assessment.id}` },
          { label: "Edit", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit assignment</CardTitle>
            <CardDescription>Update assignment details. Dates must remain within the course date range.</CardDescription>
          </CardHeader>
          <CardContent>
            <EditAssignmentForm
              courseId={assessment.courseId}
              assignmentId={assessment.id}
              initialValues={{
                title: assessment.title,
                description: assessment.description ?? "",
                startDate: toDateValuePittsburgh(assessment.releaseAt),
                startTime: toTimeValuePittsburgh(assessment.releaseAt),
                endDate: toDateValuePittsburgh(assessment.dueAt),
                endTime: toTimeValuePittsburgh(assessment.dueAt),
                lateUntilDate: assessment.lateUntil ? toDateValuePittsburgh(assessment.lateUntil) : "",
                lateUntilTime: assessment.lateUntil ? toTimeValuePittsburgh(assessment.lateUntil) : "",
                allowResubmissions: assessment.allowResubmissions,
                maxAttemptResubmission: assessment.maxAttemptResubmission,
              }}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

