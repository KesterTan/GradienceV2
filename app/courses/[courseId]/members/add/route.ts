import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/orm";
import { eq, and } from "drizzle-orm";
import { courses, courseMemberships, users } from "@/db/schema";
import { requireAppUser } from "@/lib/current-user";
import { getActiveCourseMembership } from "@/lib/course-access";

export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  try {
    const user = await requireAppUser();
    const { courseId } = params;
    const parsedCourseId = Number(courseId);
    console.log('AddMember API: courseId', courseId, 'parsedCourseId', parsedCourseId);
    if (!Number.isFinite(parsedCourseId)) {
      console.error('Invalid course ID:', courseId);
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }
    const { email, role } = await req.json();
    console.log('AddMember API: email', email, 'role', role);
    if (!email || !role || !["student", "grader"].includes(role)) {
      console.error('Invalid input:', { email, role });
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Check if user is an instructor or creator
    const courseArr = await db.select({ creatorId: courses.createdByUserId }).from(courses).where(eq(courses.id, parsedCourseId));
    const course = courseArr[0];
    if (!course) {
      console.error('Course not found:', parsedCourseId);
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const membership = await getActiveCourseMembership(parsedCourseId, user.id)
    const isInstructor = membership?.role === "grader" || course.creatorId === user.id;
    if (!isInstructor) {
      console.error('Permission denied for user:', user.id);
      return NextResponse.json({ error: "Only instructors can add members" }, { status: 403 });
    }

    // Find user by email
    const userArr = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    const memberUser = userArr[0];
    if (!memberUser) {
      console.error('User with email not found:', email);
      return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
    }

    // Prevent duplicate
    const existingMembership = await db
      .select({ id: courseMemberships.id })
      .from(courseMemberships)
      .where(and(eq(courseMemberships.courseId, parsedCourseId), eq(courseMemberships.userId, memberUser.id)));
    if (existingMembership.length > 0) {
      console.error('Duplicate membership:', memberUser.id, parsedCourseId);
      return NextResponse.json({ error: "User is already a member of this course" }, { status: 409 });
    }

    // Add membership
    await db.insert(courseMemberships).values({
      courseId: parsedCourseId,
      userId: memberUser.id,
      role,
      status: "active",
    });
    console.log('Membership added:', memberUser.id, parsedCourseId, role);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('AddMember API unexpected error:', err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
