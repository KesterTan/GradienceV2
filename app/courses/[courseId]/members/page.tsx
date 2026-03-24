import MembersClient from "@/components/members-client";
import { DashboardHeader } from "@/components/dashboard-header";
import { getCourseMembers } from "./actions";
import { requireGraderUser } from "@/lib/current-user";
import { notFound } from "next/navigation";


// Server Component: fetch data
export default async function MembersPage({ params }: { params: { courseId: string } } | { params: Promise<{ courseId: string }> }) {
  const resolvedParams = await Promise.resolve(params);
  const user = await requireGraderUser();
  const parsedCourseId = Number(resolvedParams.courseId);
  if (!Number.isFinite(parsedCourseId)) notFound();
  const { instructors, students, creatorId, courseTitle, courseCode } = await getCourseMembers(parsedCourseId);

  const isInstructor = instructors.some((i: any) => i.id === user.id) || creatorId === user.id;
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
          isInstructor={isInstructor}
          courseId={parsedCourseId}
        />
      </section>
    </main>
  );
}





