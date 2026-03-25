import { NextRequest, NextResponse } from "next/server"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions, users } from "@/db/schema"
import { requireGraderUser } from "@/lib/current-user"

type RouteParams = { courseId: string; assignmentId: string; studentMembershipId: string }

export async function GET(
  _req: NextRequest,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  try {
    const params = "then" in context.params ? await context.params : context.params
    const courseId = Number(params.courseId)
    const assignmentId = Number(params.assignmentId)
    const studentMembershipId = Number(params.studentMembershipId)

    if (
      !Number.isFinite(courseId) ||
      !Number.isFinite(assignmentId) ||
      !Number.isFinite(studentMembershipId)
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    // Auth: must be an active grader in this course
    const user = await requireGraderUser()

    // Verify the caller is actually a grader member of this course
    const membership = await db
      .select({ id: courseMemberships.id })
      .from(courseMemberships)
      .where(
        and(
          eq(courseMemberships.courseId, courseId),
          eq(courseMemberships.userId, user.id),
          eq(courseMemberships.role, "grader"),
          eq(courseMemberships.status, "active"),
        ),
      )
      .limit(1)

    if (!membership[0]) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify the assignment belongs to this course
    const assignmentRow = await db
      .select({ id: assignments.id })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
      .limit(1)

    if (!assignmentRow[0]) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Fetch all submission versions for this student, oldest first
    const rows = await db
      .select({
        id: submissions.id,
        attemptNumber: submissions.attemptNumber,
        status: submissions.status,
        submittedAt: submissions.submittedAt,
        fileUrl: submissions.fileUrl,
        studentName: users.firstName,
        studentLastName: users.lastName,
        studentEmail: users.email,
      })
      .from(submissions)
      .innerJoin(
        courseMemberships,
        and(
          eq(courseMemberships.id, submissions.studentMembershipId),
          eq(courseMemberships.id, studentMembershipId),
          eq(courseMemberships.role, "student"),
        ),
      )
      .innerJoin(users, eq(users.id, courseMemberships.userId))
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentMembershipId, studentMembershipId),
        ),
      )
      .orderBy(asc(submissions.attemptNumber))

    const history = rows.map((row) => ({
      id: Number(row.id),
      attemptNumber: Number(row.attemptNumber),
      status: String(row.status),
      submittedAt: String(row.submittedAt),
      fileUrl: row.fileUrl ? String(row.fileUrl) : null,
    }))

    return NextResponse.json({ history }, { status: 200 })
  } catch (err) {
    console.error("[student-history] unexpected error", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
