import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> },
) {
  try {
    const user = await requireAppUser()
    const { courseId, assignmentId } = await params

    const parsedCourseId = Number(courseId)
    const parsedAssignmentId = Number(assignmentId)

    if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
      return NextResponse.json({ error: "Invalid course or assessment id." }, { status: 400 })
    }

    const payload = await request.json().catch(() => null)
    const parsedSubmissionId = Number(payload?.submissionId)

    if (!Number.isFinite(parsedSubmissionId)) {
      return NextResponse.json({ error: "Invalid submission id." }, { status: 400 })
    }

    // Determine the caller's role in this course
    const membershipRows = await db
      .select({ id: courseMemberships.id, role: courseMemberships.role })
      .from(courseMemberships)
      .where(
        and(
          eq(courseMemberships.courseId, parsedCourseId),
          eq(courseMemberships.userId, user.id),
          eq(courseMemberships.status, "active"),
        ),
      )
      .limit(1)

    const membership = membershipRows[0]
    if (!membership) {
      return NextResponse.json({ error: "You are not an active member of this course." }, { status: 403 })
    }

    const isGrader = membership.role === "grader"

    const assignmentRows = await db
      .select({
        id: assignments.id,
        dueAt: assignments.dueAt,
        lateUntil: assignments.lateUntil,
      })
      .from(assignments)
      .where(and(eq(assignments.id, parsedAssignmentId), eq(assignments.courseId, parsedCourseId)))
      .limit(1)

    const assignment = assignmentRows[0]
    if (!assignment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 })
    }

    // Graders can restore any student's submission; students can only restore their own
    const sourceRows = await db
      .select({ id: submissions.id, fileUrl: submissions.fileUrl, studentMembershipId: submissions.studentMembershipId })
      .from(submissions)
      .where(
        and(
          eq(submissions.id, parsedSubmissionId),
          eq(submissions.assignmentId, parsedAssignmentId),
          ...(isGrader ? [] : [eq(submissions.studentMembershipId, Number(membership.id))]),
        ),
      )
      .limit(1)

    const sourceSubmission = sourceRows[0]
    if (!sourceSubmission || !sourceSubmission.fileUrl) {
      return NextResponse.json({ error: "Submission file not found for restore." }, { status: 404 })
    }

    const targetMembershipId = Number(sourceSubmission.studentMembershipId)

    const now = new Date()
    const dueAt = new Date(String(assignment.dueAt))
    const lateUntil = assignment.lateUntil ? new Date(String(assignment.lateUntil)) : null

    const isPastDue = now > dueAt
    const inLateWindow = isPastDue && lateUntil !== null && now <= lateUntil

    // Students can restore on time or during the late window; graders are never blocked
    if (!isGrader && isPastDue && !inLateWindow) {
      return NextResponse.json({ error: "The submission window for this assessment has closed." }, { status: 400 })
    }

    // Grader restores are always "submitted"; student restores in the late window are "late"
    const restoredStatus = isGrader ? "submitted" : inLateWindow ? "late" : "submitted"

    const attemptsRows = await db
      .select({
        latestAttempt: sql<number>`coalesce(max(${submissions.attemptNumber}), 0)`,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, targetMembershipId),
        ),
      )

    const latestAttempt = Number(attemptsRows[0]?.latestAttempt ?? 0)

    await db.insert(submissions).values({
      assignmentId: parsedAssignmentId,
      studentMembershipId: targetMembershipId,
      attemptNumber: latestAttempt + 1,
      submittedAt: now.toISOString(),
      status: restoredStatus,
      textContent: null,
      fileUrl: String(sourceSubmission.fileUrl),
      aiProcessedStatus: "awaiting",
    })

    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Unable to restore submission." }, { status: 500 })
  }
}
