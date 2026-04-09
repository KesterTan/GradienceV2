import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import { buildSubmissionS3Url, uploadSubmissionPdfToS3 } from "@/lib/s3-submissions"

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export const runtime = "nodejs"

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

    const now = new Date()
    const dueAt = new Date(String(assignment.dueAt))
    const lateUntil = assignment.lateUntil ? new Date(String(assignment.lateUntil)) : null

    const isPastDue = now > dueAt
    const inLateWindow = isPastDue && lateUntil !== null && now <= lateUntil
    const submissionStatus = isGrader ? "submitted" : !isPastDue ? "submitted" : inLateWindow ? "late" : null

    if (submissionStatus === null) {
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
      ? Math.max(1, Number(assignment.maxAttemptResubmission))
      : 1

    if (latestAttempt >= maxAttemptsAllowed) {
      return NextResponse.json({ error: "No remaining submission attempts for this assessment." }, { status: 400 })
    }

    const formData = await request.formData()
    const uploaded = formData.get("file")

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "Please attach a PDF file." }, { status: 400 })
    }

    const isPdf = uploaded.type === "application/pdf" || uploaded.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 })
    }

    if (uploaded.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "PDF must be 25 MB or smaller." }, { status: 400 })
    }

    const fileName = `${Date.now()}-${randomUUID()}.pdf`
    const objectKey = path.posix.join(
      "submissions",
      "assessments",
      String(parsedCourseId),
      String(parsedAssignmentId),
      String(membership.id),
      fileName,
    )

    const bytes = await uploaded.arrayBuffer()
    await uploadSubmissionPdfToS3({
      objectKey,
      body: Buffer.from(bytes),
    })

    await db.insert(submissions).values({
      assignmentId: parsedAssignmentId,
      studentMembershipId: Number(membership.id),
      attemptNumber: latestAttempt + 1,
      submittedAt: now.toISOString(),
      status: submissionStatus,
      textContent: null,
      fileUrl: buildSubmissionS3Url(objectKey),
      aiProcessedStatus: "awaiting",
    })

    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Assessment submission upload failed:", error)
    return NextResponse.json({ error: "Unable to submit assignment." }, { status: 500 })
  }
}
