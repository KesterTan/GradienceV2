import MembersClient from "@/components/members-client";
import { DashboardHeader } from "@/components/dashboard-header";
import { getCourseMembers } from "./actions";
import { requireAppUser } from "@/lib/current-user";
import { forbidden, notFound } from "next/navigation";
import { getCourseViewerRole } from "@/lib/course-management";


// Server Component: fetch data
export default async function MembersPage({ params }: { params: { courseId: string } } | { params: Promise<{ courseId: string }> }) {
  const resolvedParams = await Promise.resolve(params);
  const user = await requireAppUser();
  const parsedCourseId = Number(resolvedParams.courseId);
  if (!Number.isFinite(parsedCourseId)) notFound();
  const viewerRole = await getCourseViewerRole(user.id, parsedCourseId);
  if (!viewerRole) notFound();
  if (viewerRole !== "Instructor") forbidden();
  const { instructors, students, creatorId, courseTitle, courseCode } = await getCourseMembers(parsedCourseId);

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Manage Members"
        subtitle={courseTitle || undefined}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: courseTitle || "Course", href: `/courses/${resolvedParams.courseId}` },
          { label: "Members", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />
      <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <MembersClient
          instructors={instructors}
          students={students}
          userId={user.id}
          courseTitle={courseTitle}
          isInstructor
          courseId={parsedCourseId}
        />
      </section>
    </main>
  );
}




