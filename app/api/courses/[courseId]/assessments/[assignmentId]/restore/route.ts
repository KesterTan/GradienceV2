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

    const assignmentRows = await db
      .select({
        id: assignments.id,
        dueAt: assignments.dueAt,
        lateUntil: assignments.lateUntil,
        allowResubmissions: assignments.allowResubmissions,
        maxAttemptResubmission: assignments.maxAttemptResubmission,
      })
      .from(assignments)
      .where(and(eq(assignments.id, parsedAssignmentId), eq(assignments.courseId, parsedCourseId)))
      .limit(1)

    const assignment = assignmentRows[0]
    if (!assignment) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 })
    }

    const sourceRows = await db
      .select({ id: submissions.id, fileUrl: submissions.fileUrl })
      .from(submissions)
      .where(
        and(
          eq(submissions.id, parsedSubmissionId),
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, Number(membership.id)),
        ),
      )
      .limit(1)

    const sourceSubmission = sourceRows[0]
    if (!sourceSubmission || !sourceSubmission.fileUrl) {
      return NextResponse.json({ error: "Submission file not found for restore." }, { status: 404 })
    }

    const now = new Date()
    const dueAt = new Date(String(assignment.dueAt))
    const lateUntil = assignment.lateUntil ? new Date(String(assignment.lateUntil)) : null

    if (now > dueAt && (!lateUntil || now > lateUntil)) {
      return NextResponse.json({ error: "The submission window for this assessment has closed." }, { status: 400 })
    }

    const attemptsRows = await db
      .select({
        latestAttempt: sql<number>`coalesce(max(${submissions.attemptNumber}), 0)`,
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, Number(membership.id)),
        ),
      )

    const latestAttempt = Number(attemptsRows[0]?.latestAttempt ?? 0)
    const maxAttemptsAllowed = assignment.allowResubmissions
      ? Math.max(1, Number(assignment.maxAttemptResubmission) + 1)
      : 1

    if (latestAttempt >= maxAttemptsAllowed) {
      return NextResponse.json({ error: "No remaining submission attempts for this assessment." }, { status: 400 })
    }

    const status = now <= dueAt ? "submitted" : "late"

    await db.insert(submissions).values({
      assignmentId: parsedAssignmentId,
      studentMembershipId: Number(membership.id),
      attemptNumber: latestAttempt + 1,
      submittedAt: now.toISOString(),
      status,
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
