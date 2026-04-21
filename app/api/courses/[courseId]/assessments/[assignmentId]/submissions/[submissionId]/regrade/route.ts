import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, grades, regradeRequests, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import {
  createRegradeRequest,
  getExistingRegradeRequest,
  resolveRegradeRequest,
} from "@/lib/course-management"
import { revalidatePath } from "next/cache"

type Params = { courseId: string; assignmentId: string; submissionId: string }
type Context =
  | { params: Params }
  | { params: Promise<Params> }

function resolveParams(context: Context): Promise<Params> | Params {
  return "then" in context.params ? context.params : Promise.resolve(context.params)
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const { courseId, assignmentId, submissionId } = await resolveParams(context)
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const reason =
      body && typeof body === "object" && "reason" in body && typeof (body as { reason: unknown }).reason === "string"
        ? (body as { reason: string }).reason.trim()
        : ""

    if (!reason) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 })
    }

    const studentRows = await db
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
      .limit(1)

    const studentMembership = studentRows[0]
    if (!studentMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const submissionRows = await db
      .select({ id: submissions.id, studentMembershipId: submissions.studentMembershipId })
      .from(submissions)
      .innerJoin(assignments, and(eq(assignments.id, submissions.assignmentId), eq(assignments.id, parsedAssignmentId), eq(assignments.courseId, parsedCourseId)))
      .where(eq(submissions.id, parsedSubmissionId))
      .limit(1)

    const submission = submissionRows[0]
    if (!submission || Number(submission.studentMembershipId) !== studentMembership.id) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    const gradeRows = await db
      .select({ id: grades.id, isReleasedToStudent: grades.isReleasedToStudent })
      .from(grades)
      .where(eq(grades.submissionId, parsedSubmissionId))
      .limit(1)

    const grade = gradeRows[0]
    if (!grade || !grade.isReleasedToStudent) {
      return NextResponse.json({ error: "Grade has not been released yet" }, { status: 403 })
    }

    const existing = await getExistingRegradeRequest(parsedSubmissionId)
    if (existing && existing.status === "pending") {
      return NextResponse.json({ error: "A regrade request is already pending" }, { status: 409 })
    }

    const created = await createRegradeRequest(studentMembership.id, parsedSubmissionId, reason)
    return NextResponse.json({ success: true, regradeRequest: created }, { status: 201 })
  } catch (err) {
    console.error("Regrade request error:", err)
    return NextResponse.json({ error: "Failed to submit regrade request" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const { courseId, assignmentId, submissionId } = await resolveParams(context)
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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const b = body as Record<string, unknown>
    const regradeRequestId = Number(b?.regradeRequestId)
    const scores = b?.scores
    const overallFeedback =
      typeof b?.overallFeedback === "string" && b.overallFeedback.trim().length > 0
        ? b.overallFeedback.trim()
        : null

    if (!Number.isFinite(regradeRequestId) || !Array.isArray(scores)) {
      return NextResponse.json({ error: "regradeRequestId and scores are required" }, { status: 400 })
    }

    const graderRows = await db
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
      .limit(1)

    const graderMembership = graderRows[0]
    if (!graderMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const requestRows = await db
      .select({ id: regradeRequests.id, status: regradeRequests.status })
      .from(regradeRequests)
      .where(and(eq(regradeRequests.id, regradeRequestId), eq(regradeRequests.submissionId, parsedSubmissionId)))
      .limit(1)

    const regradeRequest = requestRows[0]
    if (!regradeRequest) {
      return NextResponse.json({ error: "Regrade request not found" }, { status: 404 })
    }
    if (regradeRequest.status !== "pending") {
      return NextResponse.json({ error: "Regrade request is already resolved" }, { status: 409 })
    }

    const scoreItems = (scores as Array<Record<string, unknown>>).map((item) => ({
      order: Number(item.order),
      pointsAwarded: Number(item.pointsAwarded),
      comment: typeof item.comment === "string" ? item.comment : null,
    }))

    await resolveRegradeRequest(
      regradeRequestId,
      graderMembership.id,
      parsedSubmissionId,
      parsedAssignmentId,
      scoreItems,
      overallFeedback,
    )

    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}`)
    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}/submissions/${parsedSubmissionId}/grade`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Regrade resolve error:", err)
    return NextResponse.json({ error: "Failed to resolve regrade request" }, { status: 500 })
  }
}
