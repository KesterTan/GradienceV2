import { NextRequest, NextResponse } from "next/server"
import { and, count, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, submissions } from "@/db/schema"
import { requireStudentMembership } from "@/lib/current-user"
import { uploadFile } from "@/lib/storage"

const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024) // 25 MB default

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

    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File exceeds the 25 MB size limit" }, { status: 400 })
    }

    // Determine submission status based on due date
    const now = new Date()
    const dueAt = new Date(assignment.dueAt)
    const lateUntil = assignment.lateUntil ? new Date(assignment.lateUntil) : null

    let status: string
    if (now <= dueAt) {
      status = "submitted"
    } else if (lateUntil && now <= lateUntil) {
      status = "late"
    } else {
      status = "late"
    }

    // Determine attempt number: count existing submissions for this student + assignment
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

    // Store the file
    const filePath = `submissions/${courseId}/${assignmentId}/${membership.id}/${attemptNumber}.pdf`
    const { url: fileUrl } = await uploadFile(file, filePath)

    // Insert submission row
    const inserted = await db
      .insert(submissions)
      .values({
        assignmentId,
        studentMembershipId: membership.id,
        attemptNumber,
        status,
        fileUrl,
        aiProcessedStatus: "awaiting",
      })
      .returning({ id: submissions.id })

    const submissionId = Number(inserted[0].id)

    return NextResponse.json({ submissionId, attemptNumber, fileUrl }, { status: 201 })
  } catch (err) {
    console.error("[submit] unexpected error", err)
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 })
  }
}
