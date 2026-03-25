import { NextRequest, NextResponse } from "next/server"
import { and, count, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireGraderUser } from "@/lib/current-user"

type RouteParams = { courseId: string; assignmentId: string }

export async function POST(
  req: NextRequest,
  context: { params: RouteParams } | { params: Promise<RouteParams> },
) {
  try {
    const params = "then" in context.params ? await context.params : context.params
    const courseId = Number(params.courseId)
    const assignmentId = Number(params.assignmentId)

    if (!Number.isFinite(courseId) || !Number.isFinite(assignmentId)) {
      return NextResponse.json({ error: "Invalid course or assignment ID" }, { status: 400 })
    }

    // Auth: must be an active grader in this course
    const user = await requireGraderUser()

    const graderMembership = await db
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

    if (!graderMembership[0]) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Parse body
    const body = await req.json()
    const studentMembershipId = Number(body.studentMembershipId)
    const submissionId = Number(body.submissionId)

    if (!Number.isFinite(studentMembershipId) || !Number.isFinite(submissionId)) {
      return NextResponse.json({ error: "Invalid studentMembershipId or submissionId" }, { status: 400 })
    }

    // Verify the assignment belongs to this course
    const assignmentRow = await db
      .select({ id: assignments.id, courseId: assignments.courseId })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
      .limit(1)

    if (!assignmentRow[0]) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Verify the student membership belongs to this course
    const studentMembership = await db
      .select({ id: courseMemberships.id })
      .from(courseMemberships)
      .where(
        and(
          eq(courseMemberships.id, studentMembershipId),
          eq(courseMemberships.courseId, courseId),
          eq(courseMemberships.role, "student"),
        ),
      )
      .limit(1)

    if (!studentMembership[0]) {
      return NextResponse.json({ error: "Student not found in this course" }, { status: 404 })
    }

    // Load the target submission — must belong to this student and assignment
    const targetRows = await db
      .select({
        id: submissions.id,
        fileUrl: submissions.fileUrl,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.id, submissionId),
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentMembershipId, studentMembershipId),
        ),
      )
      .limit(1)

    const target = targetRows[0]
    if (!target) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (!target.fileUrl) {
      return NextResponse.json({ error: "This version has no file to restore" }, { status: 400 })
    }

    // Determine new attempt number
    const countRows = await db
      .select({ count: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentMembershipId, studentMembershipId),
        ),
      )
    const attemptNumber = Number(countRows[0]?.count ?? 0) + 1

    // Insert new submission row — instructor restore bypasses deadline, always "resubmitted"
    const inserted = await db
      .insert(submissions)
      .values({
        assignmentId,
        studentMembershipId,
        attemptNumber,
        status: "resubmitted",
        fileUrl: target.fileUrl,
        aiProcessedStatus: "awaiting",
      })
      .returning({ id: submissions.id })

    const newSubmissionId = Number(inserted[0].id)

    return NextResponse.json(
      { submissionId: newSubmissionId, attemptNumber, fileUrl: target.fileUrl },
      { status: 201 },
    )
  } catch (err) {
    console.error("[instructor-restore] unexpected error", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
