import { NextRequest, NextResponse } from "next/server"
import { and, count, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, submissions } from "@/db/schema"
import { requireStudentMembership } from "@/lib/current-user"

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

    // Auth: must be an active student in this course
    const { membership } = await requireStudentMembership(courseId)

    // Parse body
    const body = await req.json()
    const submissionId = Number(body.submissionId)
    if (!Number.isFinite(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 })
    }

    // Load the assignment
    const assignmentRows = await db
      .select({
        id: assignments.id,
        dueAt: assignments.dueAt,
        lateUntil: assignments.lateUntil,
        isPublished: assignments.isPublished,
        courseId: assignments.courseId,
      })
      .from(assignments)
      .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
      .limit(1)

    const assignment = assignmentRows[0]
    if (!assignment || !assignment.isPublished) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    // Enforce deadline — same logic as submit route
    const now = new Date()
    const dueAt = new Date(assignment.dueAt)
    const lateUntil = assignment.lateUntil ? new Date(assignment.lateUntil) : null
    const isDeadlinePassed = now > dueAt && (lateUntil === null || now > lateUntil)

    if (isDeadlinePassed) {
      return NextResponse.json(
        { error: "The submission deadline has passed. Restoring a previous version is no longer allowed." },
        { status: 409 },
      )
    }

    // Load the target submission — must belong to this student and this assignment
    const targetRows = await db
      .select({
        id: submissions.id,
        fileUrl: submissions.fileUrl,
        studentMembershipId: submissions.studentMembershipId,
        assignmentId: submissions.assignmentId,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.id, submissionId),
          eq(submissions.assignmentId, assignmentId),
          eq(submissions.studentMembershipId, membership.id),
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
          eq(submissions.studentMembershipId, membership.id),
        ),
      )
    const attemptNumber = Number(countRows[0]?.count ?? 0) + 1

    // Determine status
    const status = now <= dueAt ? "resubmitted" : "late"

    // Insert new submission row copying the old fileUrl — no re-upload needed
    const inserted = await db
      .insert(submissions)
      .values({
        assignmentId,
        studentMembershipId: membership.id,
        attemptNumber,
        status,
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
    console.error("[restore] unexpected error", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
