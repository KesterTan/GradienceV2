import { db } from "@/db/orm";
import { courses, courseMemberships } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type NormalizedCourseRole = "grader" | "student";

export function normalizeIncomingRole(raw?: string | null): NormalizedCourseRole | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === "instructor" || s === "grader") return "grader";
  if (s === "student") return "student";
  return null;
}

export async function isUserCourseInstructor(userId: number, courseId: number): Promise<boolean> {
  // course creator is also considered an instructor
  const courseRows = await db.select({ creatorId: courses.createdByUserId }).from(courses).where(eq(courses.id, courseId)).limit(1);
  const course = courseRows[0];
  if (course && Number(course.creatorId) === Number(userId)) return true;

  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1);

  return membership.length > 0;
}
