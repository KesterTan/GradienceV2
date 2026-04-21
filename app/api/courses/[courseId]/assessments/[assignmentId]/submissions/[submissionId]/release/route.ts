import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db/orm"
import { assignments, courseMemberships, grades, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

type Params = { courseId: string; assignmentId: string; submissionId: string }
type Context = { params: Params } | { params: Promise<Params> }

export async function PATCH(
  _req: NextRequest,
  context: Context,
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

    if (!graderRows[0]) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const submissionRows = await db
      .select({ id: submissions.id })
      .from(submissions)
      .innerJoin(
        assignments,
        and(
          eq(assignments.id, submissions.assignmentId),
          eq(assignments.id, parsedAssignmentId),
          eq(assignments.courseId, parsedCourseId),
        ),
      )
      .where(eq(submissions.id, parsedSubmissionId))
      .limit(1)

    if (!submissionRows[0]) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    const gradeRows = await db
      .select({ id: grades.id, isReleasedToStudent: grades.isReleasedToStudent })
      .from(grades)
      .where(eq(grades.submissionId, parsedSubmissionId))
      .limit(1)

    const grade = gradeRows[0]
    if (!grade) {
      return NextResponse.json({ error: "No grade exists for this submission" }, { status: 404 })
    }

    if (grade.isReleasedToStudent) {
      return NextResponse.json({ success: true })
    }

    await db
      .update(grades)
      .set({
        isReleasedToStudent: true,
        releasedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(grades.id, grade.id))

    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}/submissions/${parsedSubmissionId}`)
    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}`)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Release grades error:", err)
    return NextResponse.json({ error: "Failed to release grades" }, { status: 500 })
  }
}
