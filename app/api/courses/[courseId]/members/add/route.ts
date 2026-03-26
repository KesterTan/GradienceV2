import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/orm";
import { eq, and } from "drizzle-orm";
import { courseMemberships, users } from "@/db/schema";
import { requireAppUser } from "@/lib/current-user";
import { getCourseViewerRole } from "@/lib/course-management";


export async function POST(
  req: NextRequest,
  context: { params: { courseId: string } } | { params: Promise<{ courseId: string }> }
) {
  try {
    // Await params if it's a Promise (Next.js dynamic API routes sometimes pass a Promise)
    const params = 'then' in context.params ? await context.params : context.params;
    const { courseId } = params;
    const user = await requireGraderUser();
    const parsedCourseId = Number(courseId);
    if (!Number.isFinite(parsedCourseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }
    const { email, role } = await req.json();
    if (!email || !role || !["student", "grader"].includes(role)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const viewerRole = await getCourseViewerRole(user.id, parsedCourseId);
    if (!viewerRole) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (viewerRole !== "Instructor") {
      return NextResponse.json({ error: "Only instructors can add members" }, { status: 403 });
    }

    // Find user by email
    const userArr = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.email, email));
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

    return NextResponse.json({
      success: true,
      id: inserted[0]?.id,
      userId: memberUser.id,
      member: {
        id: memberUser.id,
        name: `${memberUser.firstName} ${memberUser.lastName}`,
        email: memberUser.email,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
