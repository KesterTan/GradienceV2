import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import { and, eq, max } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export async function POST(
  req: NextRequest,
  context:
    | { params: { courseId: string; assignmentId: string } }
    | { params: Promise<{ courseId: string; assignmentId: string }> },
) {
  try {
    const params = "then" in context.params ? await context.params : context.params
    const { courseId, assignmentId } = params
    const user = await requireAppUser()

    const parsedCourseId = Number(courseId)
    const parsedAssignmentId = Number(assignmentId)
    if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
      return NextResponse.json({ error: "Invalid course or assignment ID" }, { status: 400 })
    }

    // Confirm student membership
    const membershipRows = await db
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

    const membership = membershipRows[0]
    if (!membership) {
      return NextResponse.json(
        { error: "You are not enrolled as a student in this course" },
        { status: 403 },
      )
    }

    // Confirm assignment belongs to this course and check deadline
    const assignmentRows = await db
      .select({ id: assignments.id, dueAt: assignments.dueAt })
      .from(assignments)
      .where(and(eq(assignments.id, parsedAssignmentId), eq(assignments.courseId, parsedCourseId)))
      .limit(1)

    if (!assignmentRows[0]) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    if (new Date() > new Date(assignmentRows[0].dueAt)) {
      return NextResponse.json({ error: "The submission deadline has passed" }, { status: 403 })
    }

    // Parse file from form data
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
    }

    // Save to public/uploads/
    const filename = `${randomUUID()}.pdf`
    const uploadDir = join(process.cwd(), "public", "uploads")
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadDir, filename), Buffer.from(bytes))
    const fileUrl = `/uploads/${filename}`

    // Increment attempt number
    const maxResult = await db
      .select({ maxAttempt: max(submissions.attemptNumber) })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, membership.id),
        ),
      )
    const nextAttempt = (Number(maxResult[0]?.maxAttempt) || 0) + 1

    // Insert submission
    const inserted = await db
      .insert(submissions)
      .values({
        assignmentId: parsedAssignmentId,
        studentMembershipId: membership.id,
        attemptNumber: nextAttempt,
        status: "submitted",
        fileUrl,
      })
      .returning({ id: submissions.id })

    return NextResponse.json({ success: true, submissionId: inserted[0]?.id, fileUrl })
  } catch (err) {
    console.error("Submit error:", err)
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 })
  }
}
