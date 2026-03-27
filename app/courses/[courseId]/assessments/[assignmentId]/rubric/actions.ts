"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignmentRubricItems, assignments, courseMemberships } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import {
  buildRubricFieldErrors,
  flattenRubricItems,
  getRubricItemCount,
  getRubricTotalMaxScore,
  rubricPayloadSchema,
} from "@/lib/rubrics"

export type RubricFormState = {
  errors?: {
    rubricPayload?: string[]
    fieldErrors?: Record<string, string[]>
    _form?: string[]
  }
}

async function requireInstructorMembership(courseId: number, userId: number) {
  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  return membership[0] ?? null
}

export async function updateRubricAction(
  _prevState: RubricFormState,
  formData: FormData,
): Promise<RubricFormState> {
  const user = await requireAppUser()

  const rawCourseId = formData.get("courseId")
  const rawAssignmentId = formData.get("assignmentId")
  const courseId = typeof rawCourseId === "string" ? Number(rawCourseId) : NaN
  const assignmentId = typeof rawAssignmentId === "string" ? Number(rawAssignmentId) : NaN

  if (!Number.isFinite(courseId) || !Number.isFinite(assignmentId)) {
    return { errors: { _form: ["Invalid course or assignment id."] } }
  }

  const membership = await requireInstructorMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["You do not have permission to edit rubrics for this assessment."] } }
  }

  const rawPayload = formData.get("rubricPayload")
  if (typeof rawPayload !== "string" || rawPayload.trim().length === 0) {
    return { errors: { rubricPayload: ["Rubric payload is required."] } }
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(rawPayload)
  } catch (error) {
    return { errors: { rubricPayload: ["Rubric payload must be valid JSON."] } }
  }

  const parsed = rubricPayloadSchema.safeParse(parsedPayload)
  if (!parsed.success) {
    return { errors: { fieldErrors: buildRubricFieldErrors(parsed.error) } }
  }

  const rubricJson = parsed.data
  const itemCount = getRubricItemCount(rubricJson)
  if (itemCount > 1000) {
    return { errors: { rubricPayload: ["Rubrics can include at most 1000 items."] } }
  }

  const existing = await db
    .select({ id: assignments.id, totalPoints: assignments.totalPoints })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  const assignment = existing[0]
  if (!assignment) {
    return { errors: { _form: ["Assessment not found."] } }
  }

  const totalMaxScore = getRubricTotalMaxScore(rubricJson)

  const flattenedItems = flattenRubricItems(rubricJson)

  await db.transaction(async (tx) => {
    await tx
      .update(assignments)
      .set({ rubricJson, totalPoints: totalMaxScore, updatedAt: new Date().toISOString() })
      .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))

    await tx.delete(assignmentRubricItems).where(eq(assignmentRubricItems.assignmentId, assignmentId))

    await tx.insert(assignmentRubricItems).values(
      flattenedItems.map((item, index) => ({
        assignmentId,
        title: item.rubric_name,
        description: item.criterion,
        maxPoints: item.max_score,
        displayOrder: index + 1,
        gradingGuidance: JSON.stringify({
          question_id: item.question_id,
          question_name: item.question_name,
          criterion: item.criterion,
          rubric_name: item.rubric_name,
          max_score: item.max_score,
        }),
      })),
    )
  })

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}/rubric`)

  return {}
}
