import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/current-user";
import { getCourseViewerRole } from "@/lib/course-management";
// POST /courses/[courseId]/members/add
export async function POST(req: NextRequest, { params }: { params: { courseId: string } }) {
  const user = await requireAppUser();
  const { courseId } = params;
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
  await db.insert(courseMemberships).values({
    courseId: parsedCourseId,
    userId: memberUser.id,
    role,
    status: "active",
  });

  return NextResponse.json({ success: true });
}
import { db } from "@/db/orm";
import { eq, and } from "drizzle-orm";
import { courses, courseMemberships, users } from "@/db/schema";

// Returns { instructors: [{id, name}], students: [{id, name}], creatorId }
export async function getCourseMembers(courseId: number) {
  // Get course to find creator
  const courseArr = await db.select({ creatorId: courses.createdByUserId, courseTitle: courses.title, courseCode: courses.courseCode }).from(courses).where(eq(courses.id, courseId));
  const course = courseArr[0];
  if (!course) return { instructors: [], students: [], creatorId: null, courseTitle: null, courseCode: null };

  // Get instructors (including creator)
      const instructorMemberships = await db
        .select({ courseMemberships, users })
        .from(courseMemberships)
        .innerJoin(users, eq(courseMemberships.userId, users.id))
        .where(and(eq(courseMemberships.courseId, courseId), eq(courseMemberships.role, "grader")));

  // Add creator if not already in instructors
  const creatorArr = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, course.creatorId));
  const creator = creatorArr[0];
    let instructorList = instructorMemberships.map(row => {
      const user = row.users;
      return { id: user.id, name: `${user.firstName} ${user.lastName}` };
    });
  if (creator && !instructorList.some(i => i.id === creator.id)) {
    instructorList = [{ id: creator.id, name: `${creator.firstName} ${creator.lastName}` }, ...instructorList];
  }

  // Get students
    const studentMemberships = await db
      .select({ courseMemberships, users })
    .from(courseMemberships)
    .innerJoin(users, eq(courseMemberships.userId, users.id))
    .where(and(eq(courseMemberships.courseId, courseId), eq(courseMemberships.role, "student")));
    const studentList = studentMemberships.map(row => {
      const user = row.users;
      return { id: user.id, name: `${user.firstName} ${user.lastName}` };
    });

  return { instructors: instructorList, students: studentList, creatorId: creator?.id, courseTitle: course.courseTitle, courseCode: course.courseCode };
}
