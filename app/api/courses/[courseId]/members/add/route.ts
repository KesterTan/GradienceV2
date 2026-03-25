import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/orm";
import { eq, and } from "drizzle-orm";
import { courses, courseMemberships, users } from "@/db/schema";
import { requireAppUser } from "@/lib/current-user";


export async function POST(
  req: NextRequest,
  context: { params: { courseId: string } } | { params: Promise<{ courseId: string }> }
) {
  try {
    // Await params if it's a Promise (Next.js dynamic API routes sometimes pass a Promise)
    const params = 'then' in context.params ? await context.params : context.params;
    const { courseId } = params;
    const user = await requireAppUser();
    const parsedCourseId = Number(courseId);
    if (!Number.isFinite(parsedCourseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }
    const { email, role } = await req.json();
    if (!email || !role || !["student", "grader"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Check if user is an instructor or creator
    const courseArr = await db.select({ creatorId: courses.createdByUserId }).from(courses).where(eq(courses.id, parsedCourseId));
    const course = courseArr[0];
    if (!course) {
      // If course doesn't exist, treat as permission denied for security
      return NextResponse.json({ error: "Only instructors can add members" }, { status: 403 });
    }

    // Get instructors (including creator)
    const instructorMemberships = await db
      .select({ courseMemberships, users })
      .from(courseMemberships)
      .innerJoin(users, eq(courseMemberships.userId, users.id))
      .where(and(eq(courseMemberships.courseId, parsedCourseId), eq(courseMemberships.role, "grader")));
    const isInstructor = instructorMemberships.some(row => row.users.id === user.id) || course.creatorId === user.id;
    if (!isInstructor) {
      return NextResponse.json({ error: "Only instructors can add members" }, { status: 403 });
    }

    // Find user by email
    const userArr = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    const memberUser = userArr[0];
    if (!memberUser) {
      return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
    }

    // Prevent duplicate
    const existingMembership = await db
      .select({ id: courseMemberships.id })
      .from(courseMemberships)
      .where(and(eq(courseMemberships.courseId, parsedCourseId), eq(courseMemberships.userId, memberUser.id)));
    if (existingMembership.length > 0) {
      return NextResponse.json({ error: "User is already a member of this course" }, { status: 409 });
    }

    // Add membership
    const inserted = await db.insert(courseMemberships).values({
      courseId: parsedCourseId,
      userId: memberUser.id,
      role,
      status: "active",
    }).returning({ id: courseMemberships.id });

    return NextResponse.json({ success: true, id: inserted[0]?.id });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
