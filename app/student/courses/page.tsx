import Link from "next/link"
import { BookOpen, Calendar } from "lucide-react"
import { format } from "date-fns"
import { DashboardHeader } from "@/components/dashboard-header"
import { requireAppUser } from "@/lib/current-user"
import { listCoursesForStudent } from "@/lib/student-queries"

export default async function StudentCoursesPage() {
  const user = await requireAppUser()

  const courses = await listCoursesForStudent(user.id)

  return (
    <main className="min-h-screen bg-[#F0F0F8]">
      <DashboardHeader
        title="My Courses"
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        showCoursesLink={false}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
            <BookOpen className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            <p className="text-sm text-gray-500">View your enrolled courses and submit assignments.</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center">
            <p className="text-sm text-gray-400">You are not enrolled in any courses yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {course.courseCode} - {course.title}
                    </span>
                    <span className="rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                      Student
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(course.startDate), "M/d/yyyy")} –{" "}
                      {format(new Date(course.endDate), "M/d/yyyy")}
                    </span>
                    {course.instructors.length > 0 && (
                      <span>
                        {course.instructors.length} instructor{course.instructors.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span>
                      {course.publishedAssignmentCount} assignment{course.publishedAssignmentCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/student/courses/${course.id}`}
                  className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
