import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { EditCourseForm } from "@/components/edit-course-form"
import { DeleteCourseButton } from "@/components/delete-course-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCourseForGrader } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

export default async function ManageCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const user = await requireAppUser()
  const { courseId } = await params
  const parsedCourseId = Number(courseId)

  if (!Number.isFinite(parsedCourseId)) {
    return (
      <main className="min-h-screen bg-muted/30">
        <DashboardHeader
          title="Manage course"
          subtitle="Invalid course"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: "Manage course", current: true },
          ]}
          user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        />
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Invalid course</CardTitle>
              <CardDescription>The course id in the URL is not valid.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/courses">Back to courses</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  const course = await getCourseForGrader(user.id, parsedCourseId)
  if (!course) {
    return (
      <main className="min-h-screen bg-muted/30">
        <DashboardHeader
          title="Manage course"
          subtitle="Course not found"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: "Manage course", current: true },
          ]}
          user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        />
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Course not found</CardTitle>
              <CardDescription>
                You may not have access to this course, or it may have been deleted.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/courses">Back to courses</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/courses/${parsedCourseId}`}>Try course dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  if (course.viewerRole !== "Instructor") {
    return (
      <main className="min-h-screen bg-muted/30">
        <DashboardHeader
          title="Manage course"
          subtitle={course.title}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: course.title, href: `/courses/${course.id}` },
            { label: "Manage course", current: true },
          ]}
          user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
        />
        <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
              <CardDescription>Only instructors can edit or delete this course.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/courses/${course.id}`}>Back to course</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Manage course"
        subtitle={course.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: course.title, href: `/courses/${course.id}` },
          { label: "Manage course", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Course details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the course title or date range. End date must be on or after start date.
          </p>
        </div>
        <EditCourseForm
          courseId={course.id}
          title={course.title}
          startDate={course.startDate}
          endDate={course.endDate}
        />

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-foreground">Delete course</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Deleting a course removes enrollments, assignments, and submissions.
          </p>
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-6">
            <DeleteCourseButton courseId={course.id} courseTitle={course.title} />
          </div>
        </div>
      </section>
    </main>
  )
}
