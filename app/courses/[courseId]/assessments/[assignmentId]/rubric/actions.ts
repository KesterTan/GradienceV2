"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export type RubricFormState = {
  errors?: {
    rubricPayload?: string[]
    fieldErrors?: Record<string, string[]>
    _form?: string[]
  }
}

const rubricItemSchema = z.object({
  criterion: z.string().trim().min(1, "Criterion is required"),
  rubric_name: z.string().trim().min(1, "Rubric name is required"),
  max_score: z.number().finite().min(0),
})

const rubricQuestionSchema = z.object({
  question_id: z.string().trim().min(1, "Question id is required"),
  question_name: z.string().trim().min(1, "Question name is required"),
  rubric_items: z.array(rubricItemSchema),
})

const rubricPayloadSchema = z.object({
  questions: z.array(rubricQuestionSchema),
})

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
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      if (!issue.path.length) continue
      const key = issue.path.join(".")
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    return { errors: { fieldErrors } }
  }

  const itemCount = parsed.data.questions.reduce((sum, question) => sum + question.rubric_items.length, 0)
  if (itemCount > 1000) {
    return { errors: { rubricPayload: ["Rubrics can include at most 1000 items."] } }
  }

  const rubricJson = parsed.data

  const existing = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  if (!existing[0]) {
    return { errors: { _form: ["Assessment not found."] } }
  }

  await db
    .update(assignments)
    .set({ rubricJson })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}/rubric`)

  return {}
}
