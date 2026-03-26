import { NextRequest, NextResponse } from "next/server"
import { and, eq, max } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export async function POST(
  _req: NextRequest,
  context:
    | { params: { courseId: string; assignmentId: string; submissionId: string } }
    | { params: Promise<{ courseId: string; assignmentId: string; submissionId: string }> },
) {
  try {
    const params = "then" in context.params ? await context.params : context.params
    const { courseId, assignmentId, submissionId } = params
    const user = await requireAppUser()

    const parsedCourseId = Number(courseId)
    const parsedAssignmentId = Number(assignmentId)
    const parsedSubmissionId = Number(submissionId)
    if (
      !Number.isFinite(parsedCourseId) ||
      !Number.isFinite(parsedAssignmentId) ||
      !Number.isFinite(parsedSubmissionId)
    ) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    // Load the target submission with its assignment's dueAt for deadline checks
    const targetRows = await db
      .select({
        id: submissions.id,
        fileUrl: submissions.fileUrl,
        studentMembershipId: submissions.studentMembershipId,
        dueAt: assignments.dueAt,
        assignmentCourseId: assignments.courseId,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .where(
        and(
          eq(submissions.id, parsedSubmissionId),
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(assignments.courseId, parsedCourseId),
        ),
      )
      .limit(1)

    const target = targetRows[0]
    if (!target) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    if (!target.fileUrl) {
      return NextResponse.json({ error: "This submission has no file to restore" }, { status: 400 })
    }

    // Determine caller's role in this course
    const [studentRows, graderRows] = await Promise.all([
      db
        .select({ id: courseMemberships.id })
        .from(courseMemberships)
        .where(
          and(
            eq(courseMemberships.courseId, parsedCourseId),
            eq(courseMemberships.userId, user.id),
            eq(courseMemberships.role, "student"),
            eq(courseMemberships.status, "active"),
          ),
        )
        .limit(1),
      db
        .select({ id: courseMemberships.id })
        .from(courseMemberships)
        .where(
          and(
            eq(courseMemberships.courseId, parsedCourseId),
            eq(courseMemberships.userId, user.id),
            eq(courseMemberships.role, "grader"),
            eq(courseMemberships.status, "active"),
          ),
        )
        .limit(1),
    ])

    const studentMembership = studentRows[0]
    const isInstructor = graderRows.length > 0

    if (!studentMembership && !isInstructor) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (studentMembership && !isInstructor) {
      // Student must own this submission
      if (Number(target.studentMembershipId) !== studentMembership.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
      // Students cannot restore after the deadline
      if (new Date() > new Date(target.dueAt)) {
        return NextResponse.json(
          { error: "The submission deadline has passed. You can no longer restore previous versions." },
          { status: 403 },
        )
      }
    }

    // Calculate next attempt number for this student+assignment
    const maxResult = await db
      .select({ maxAttempt: max(submissions.attemptNumber) })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, target.studentMembershipId),
        ),
      )
    const nextAttempt = (Number(maxResult[0]?.maxAttempt) || 0) + 1

    // Insert new submission copying the target's file
    await db.insert(submissions).values({
      assignmentId: parsedAssignmentId,
      studentMembershipId: target.studentMembershipId,
      attemptNumber: nextAttempt,
      status: "submitted",
      fileUrl: target.fileUrl,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Restore error:", err)
    return NextResponse.json({ error: "Restore failed. Please try again." }, { status: 500 })
  }
}
