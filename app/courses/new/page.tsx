import { DashboardHeader } from "@/components/dashboard-header"
import { CreateCourseForm } from "@/components/create-course-form"
import { requireAppUser } from "@/lib/current-user"

export default async function CreateCoursePage() {
  const user = await requireAppUser()

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Create course"
        subtitle="Set up a new course for grading"
        breadcrumbs={[
          { label: "Home", href: "/courses" },
          { label: "Create course", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-foreground">New course</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Title is required. If both dates are provided, end date must be on or after start date.
          </p>
        </div>
        <CreateCourseForm />
      </section>
    </main>
  )
}
