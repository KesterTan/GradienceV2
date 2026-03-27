import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/orm";
import { eq, and } from "drizzle-orm";
import { courses, courseMemberships, users } from "@/db/schema";
import { requireAppUser } from "@/lib/current-user";
import { isUserCourseInstructor } from "@/lib/rbac";

// DELETE /courses/[courseId]/members/remove
export async function DELETE(
  req: NextRequest,
  context: { params: { courseId: string } } | { params: Promise<{ courseId: string }> }
) {
  const user = await requireAppUser();
  const params = "then" in context.params ? await context.params : context.params;
  const { courseId } = params;
  const parsedCourseId = Number(courseId);
  if (!Number.isFinite(parsedCourseId)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }
  const { memberId } = await req.json();
  if (!memberId) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Check if course exists
  const courseArr = await db.select({ creatorId: courses.createdByUserId }).from(courses).where(eq(courses.id, parsedCourseId));
  const course = courseArr[0];
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Check if user is instructor or creator
  const isInstructor = await isUserCourseInstructor(user.id, parsedCourseId);
  if (!isInstructor) {
    return NextResponse.json({ error: "Only instructors can remove members" }, { status: 403 });
  }

  // Check if member exists
  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(and(eq(courseMemberships.courseId, parsedCourseId), eq(courseMemberships.userId, memberId)));
  if (membership.length === 0) {
    return NextResponse.json({ error: "Member does not exist in this course" }, { status: 404 });
  }

  // Remove membership
  await db.delete(courseMemberships).where(and(eq(courseMemberships.courseId, parsedCourseId), eq(courseMemberships.userId, memberId)));
  return NextResponse.json({ success: true });
}
