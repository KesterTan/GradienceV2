import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { requireStudentMembership } from "@/lib/current-user"
import {
  getAssignmentForStudent,
  listSubmissionsForStudent,
} from "@/lib/student-queries"
import { AssignmentClient } from "./assignment-client"

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const { courseId, assignmentId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
    notFound()
  }

  const { user } = await requireStudentMembership(parsedCourseId)

  const [assignment, submissions] = await Promise.all([
    getAssignmentForStudent(user.id, parsedCourseId, parsedAssignmentId),
    listSubmissionsForStudent(user.id, parsedCourseId, parsedAssignmentId),
  ])

  if (!assignment) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#F0F0F8]">
      <DashboardHeader
        title={assignment.title}
        breadcrumbs={[
          { label: "Home", href: `/student/courses/${parsedCourseId}` },
          { label: assignment.courseTitle, href: `/student/courses/${parsedCourseId}` },
          { label: assignment.title, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <AssignmentClient
          assignment={assignment}
          initialSubmissions={submissions}
        />
      </section>
    </main>
  )
}
