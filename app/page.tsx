import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"
import { db } from "@/db/orm"
import { courseMemberships } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export default async function RootPage() {
  const user = await requireAppUser()

  const graderMembership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.userId, user.id),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  if (graderMembership.length === 0) {
    redirect("/student/courses")
  }

  redirect("/courses")
}
