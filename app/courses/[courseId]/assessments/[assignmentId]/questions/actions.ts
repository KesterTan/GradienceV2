"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courses, courseMemberships } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import { questionsPayloadSchema, type QuestionsPayload } from "@/lib/questions"
import { buildQuestionsS3ObjectKey, uploadQuestionsJsonToS3 } from "@/lib/s3-submissions"

export type QuestionsFormState = {
  success?: boolean
  savedQuestions?: import("@/lib/questions").AssignmentQuestion[]
  errors?: {
    questionsPayload?: string[]
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

export async function saveQuestionsAction(
  _prevState: QuestionsFormState,
  formData: FormData,
): Promise<QuestionsFormState> {
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
    return { errors: { _form: ["You do not have permission to edit questions for this assessment."] } }
  }

  const rawPayload = formData.get("questionsPayload")
  if (typeof rawPayload !== "string" || rawPayload.trim().length === 0) {
    return { errors: { questionsPayload: ["Questions payload is required."] } }
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(rawPayload)
  } catch {
    return { errors: { questionsPayload: ["Questions payload must be valid JSON."] } }
  }

  const parsed = questionsPayloadSchema.safeParse(parsedPayload)
  if (!parsed.success) {
    const { formErrors } = parsed.error.flatten()
    const fieldErrors: Record<string, string[]> = {}
    for (const issue of parsed.error.issues) {
      if (!issue.path.length) continue
      const key = issue.path.join(".")
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }
    if (Object.keys(fieldErrors).length === 0) {
      return {
        errors: {
          questionsPayload:
            formErrors.length > 0 ? formErrors : ["Questions payload is invalid."],
        },
      }
    }
    return { errors: { fieldErrors } }
  }

  const existing = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  if (!existing[0]) {
    return { errors: { _form: ["Assessment not found."] } }
  }

  // Enrich payload with assignment + course metadata from DB
  const assignmentRows = await db
    .select({
      title: assignments.title,
      description: assignments.description,
      courseTitle: courses.title,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  const meta = assignmentRows[0]
  if (!meta) {
    return { errors: { _form: ["Assessment not found."] } }
  }

  const questionsJson: QuestionsPayload = {
    assignment_title: meta.title,
    course: meta.courseTitle,
    instructions_summary: meta.description ?? "",
    questions: parsed.data.questions,
  }

  try {
    await uploadQuestionsJsonToS3({
      objectKey: buildQuestionsS3ObjectKey({ courseId, assignmentId }),
      questionsJson,
    })
  } catch {
    return { errors: { _form: ["Unable to save questions JSON to S3. Check S3 configuration and try again."] } }
  }

  await db
    .update(assignments)
    .set({ questionsJson, updatedAt: new Date().toISOString() })
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}/questions`)

  return { success: true, savedQuestions: questionsJson.questions }
}
