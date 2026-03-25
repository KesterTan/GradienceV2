import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { courseMemberships } from "@/db/schema"

export type ActiveCourseMembership = {
  id: number
  role: "grader" | "student"
}

export async function getActiveCourseMembership(
  courseId: number,
  userId: number,
): Promise<ActiveCourseMembership | null> {
  const membership = await db
    .select({
      id: courseMemberships.id,
      role: courseMemberships.role,
    })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  const row = membership[0]
  if (!row) return null

  return {
    id: Number(row.id),
    role: row.role as "grader" | "student",
  }
}
