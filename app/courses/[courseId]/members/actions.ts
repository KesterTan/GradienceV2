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
      // TEMP: Log the result structure for debugging
      console.log('DEBUG instructorMemberships:', JSON.stringify(instructorMemberships, null, 2));

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
