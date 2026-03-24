import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, FileText } from "lucide-react"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { requireStudentMembership } from "@/lib/current-user"
import { getCourseForStudent, listAssignmentsForStudent, StudentAssignmentSummary } from "@/lib/student-queries"

const STATUS_BADGE: Record<
  StudentAssignmentSummary["submissionStatus"],
  { label: string; className: string }
> = {
  not_submitted: { label: "Not submitted",  className: "bg-gray-100 text-gray-500 border-gray-200" },
  submitted:     { label: "Submitted",       className: "bg-green-50 text-green-700 border-green-200" },
  late:          { label: "Late",            className: "bg-amber-50 text-amber-700 border-amber-200" },
  resubmitted:   { label: "Resubmitted",     className: "bg-blue-50 text-blue-700 border-blue-200" },
  graded:        { label: "Graded",          className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
}

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params
  const parsedCourseId = Number(courseId)

  if (!Number.isFinite(parsedCourseId)) notFound()

  const { user } = await requireStudentMembership(parsedCourseId)

  const [course, assignments] = await Promise.all([
    getCourseForStudent(user.id, parsedCourseId),
    listAssignmentsForStudent(user.id, parsedCourseId),
  ])

  if (!course) notFound()

  return (
    <main className="min-h-screen bg-[#F0F0F8]">
      <DashboardHeader
        title={course.title}
        breadcrumbs={[
          { label: "Home", href: "/student/courses" },
          { label: course.title, current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Course header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {course.courseCode} · {course.term}
            {course.instructors.length > 0 && (
              <> · Instructor{course.instructors.length > 1 ? "s" : ""}: {course.instructors.join(", ")}</>
            )}
          </p>
          {course.description && (
            <p className="mt-2 text-sm text-gray-500">{course.description}</p>
          )}
        </div>

        {/* Assignments */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Assignments</h2>
          <span className="text-sm text-gray-400">{assignments.length} total</span>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-400">No assignments have been published yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const badge = STATUS_BADGE[assignment.submissionStatus]
              const isOverdue =
                assignment.submissionStatus === "not_submitted" &&
                new Date() > new Date(assignment.dueAt)

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
                      <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {assignment.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due {format(new Date(assignment.dueAt), "MMM d, yyyy")}
                          {isOverdue && (
                            <span className="ml-1 text-amber-600 font-medium">· Past due</span>
                          )}
                        </span>
                        <span>{assignment.totalPoints} pts</span>
                        {assignment.latestAttemptNumber !== null && (
                          <span>Version {assignment.latestAttemptNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`hidden sm:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <Link
                      href={`/student/courses/${parsedCourseId}/assignments/${assignment.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
