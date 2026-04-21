import { NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db/orm"
import { assignmentRubricItems, assignments, courseMemberships, grades, rubricScores, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

type Params = { courseId: string; assignmentId: string }
type Context = { params: Params } | { params: Promise<Params> }

export async function POST(req: NextRequest, context: Context) {
  try {
    const params = "then" in context.params ? await context.params : context.params
    const { courseId, assignmentId } = params
    const user = await requireAppUser()

    const parsedCourseId = Number(courseId)
    const parsedAssignmentId = Number(assignmentId)
    if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const studentMembershipId = Number((body as Record<string, unknown>)?.studentMembershipId)
    if (!Number.isFinite(studentMembershipId)) {
      return NextResponse.json({ error: "studentMembershipId is required" }, { status: 400 })
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

    const studentRows = await db
      .select({ id: courseMemberships.id })
      .from(courseMemberships)
      .where(
        and(
          eq(courseMemberships.id, studentMembershipId),
          eq(courseMemberships.courseId, parsedCourseId),
          eq(courseMemberships.role, "student"),
          eq(courseMemberships.status, "active"),
        ),
      )
      .limit(1)

    if (!studentRows[0]) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const existingSubmission = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, parsedAssignmentId),
          eq(submissions.studentMembershipId, studentMembershipId),
        ),
      )
      .limit(1)

    if (existingSubmission[0]) {
      return NextResponse.json({ error: "Student already has a submission" }, { status: 409 })
    }

    const rubricItems = await db
      .select({ id: assignmentRubricItems.id })
      .from(assignmentRubricItems)
      .where(eq(assignmentRubricItems.assignmentId, parsedAssignmentId))

    let newSubmissionId: number

    await db.transaction(async (tx) => {
      const insertedSubmissions = await tx
        .insert(submissions)
        .values({
          assignmentId: parsedAssignmentId,
          studentMembershipId,
          attemptNumber: 1,
          status: "graded",
        })
        .returning({ id: submissions.id })

      newSubmissionId = insertedSubmissions[0].id

      const insertedGrades = await tx
        .insert(grades)
        .values({
          submissionId: newSubmissionId,
          gradedByMembershipId: graderRows[0].id,
          totalScore: 0,
          isReleasedToStudent: true,
          releasedAt: new Date().toISOString(),
        })
        .returning({ id: grades.id })

      const gradeId = insertedGrades[0].id

      if (rubricItems.length > 0) {
        await tx.insert(rubricScores).values(
          rubricItems.map((item) => ({
            gradeId,
            rubricItemId: item.id,
            pointsAwarded: 0,
          })),
        )
      }
    })

    revalidatePath(`/courses/${parsedCourseId}/assessments/${parsedAssignmentId}`)

    return NextResponse.json({ success: true, submissionId: newSubmissionId! })
  } catch (err) {
    console.error("Assign zero error:", err)
    return NextResponse.json({ error: "Failed to assign zero grade" }, { status: 500 })
  }
}
