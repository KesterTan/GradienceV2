import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateAssignmentForm } from "../_components/create-assignment-form"
import { getCourseForGrader } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

export default async function CreateAssessmentPage({
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
          title="Create assignment"
          subtitle="Invalid course"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: "Create assignment", current: true },
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
          title="Create assignment"
          subtitle="Course not found"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Courses", href: "/courses" },
            { label: "Create assignment", current: true },
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

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Create assignment"
        subtitle={course.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: course.title, href: `/courses/${course.id}` },
          { label: "Create assignment", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-foreground">New assignment</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Title is required. If both dates are provided, end date must be on or after start date.
          </p>
        </div>
        <CreateAssignmentForm courseId={course.id} />
      </section>
    </main>
  )
}

