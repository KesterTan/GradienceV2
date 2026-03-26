import { forbidden, notFound } from "next/navigation"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EditAssignmentForm } from "./_components/edit-assignment-form"
import { getAssessmentForGrader, getCourseViewerRole } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

function toDateValue(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd")
}

function toTimeValue(iso: string) {
  return format(new Date(iso), "HH:mm")
}

function toOptionalDateValue(iso: string | null) {
  if (!iso) return ""
  return format(new Date(iso), "yyyy-MM-dd")
}

function toOptionalTimeValue(iso: string | null) {
  if (!iso) return ""
  return format(new Date(iso), "HH:mm")
}

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

  const viewerRole = await getCourseViewerRole(user.id, parsedCourseId)
  if (!viewerRole) {
    notFound()
  }
  if (viewerRole !== "Instructor") {
    forbidden()
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
          { label: "Home", href: "/" },
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
                startDate: toDateValue(assessment.releaseAt),
                startTime: toTimeValue(assessment.releaseAt),
                endDate: toDateValue(assessment.dueAt),
                endTime: toTimeValue(assessment.dueAt),
                lateUntilDate: toOptionalDateValue(assessment.lateUntil),
                lateUntilTime: toOptionalTimeValue(assessment.lateUntil),
              }}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
