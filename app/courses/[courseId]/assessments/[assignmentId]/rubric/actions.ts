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
import {
  loadAssignmentQuestionsJsonFromS3,
  normalizeSuggestedRubricPayload,
  parseAiEndpoint,
} from "@/lib/rubric-suggestion"
import {
  buildRubricS3ObjectKey,
  uploadRubricJsonToS3,
} from "@/lib/s3-submissions"

export type RubricFormState = {
  errors?: {
    rubricPayload?: string[]
    fieldErrors?: Record<string, string[]>
    _form?: string[]
  }
}

export type RubricSuggestionState = {
  rubric?: {
    questions: Array<{
      question_id: string
      question_max_total: number
      rubric_items: Array<{
        criterion: string
        explanation: string
        max_score: number
      }>
    }>
    overall_feedback: string
  }
  errors?: {
    _form?: string[]
  }
}

export async function generateRubricSuggestionAction(
  _prevState: RubricSuggestionState,
  formData: FormData,
): Promise<RubricSuggestionState> {
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
    return { errors: { _form: ["You do not have permission to generate rubrics for this assessment."] } }
  }

  const assignmentRows = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  if (!assignmentRows[0]) {
    return { errors: { _form: ["Assessment not found."] } }
  }

  let questionPayload: unknown = null
  try {
    questionPayload = await loadAssignmentQuestionsJsonFromS3(courseId, assignmentId)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      errors: {
        _form: [
          `Unable to read assignment questions from storage. ${message}`,
        ],
      },
    }
  }

  if (!questionPayload) {
    return {
      errors: {
        _form: [
          "Unable to find assignment questions JSON in S3 for this assessment.",
        ],
      },
    }
  }

  const rubricSuggestUrlResult = parseAiEndpoint(
    "AI_RUBRIC_SUGGEST_API_URL",
    process.env.AI_RUBRIC_SUGGEST_API_URL,
  )
  if ("error" in rubricSuggestUrlResult) {
    return { errors: { _form: [rubricSuggestUrlResult.error] } }
  }

  const rubricSuggestUrl = rubricSuggestUrlResult.value

  const payload = new FormData()
  payload.append(
    "question_file",
    new Blob([JSON.stringify(questionPayload)], { type: "application/json" }),
    `assignment-${assignmentId}-questions.json`,
  )

  const controller = new AbortController()
  const timeoutMs = 8000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(rubricSuggestUrl, {
      method: "POST",
      body: payload,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { errors: { _form: ["Rubric suggestion request timed out. Please try again."] } }
    }
    return { errors: { _form: ["Unable to reach the rubric suggestion service right now."] } }
  } finally {
    clearTimeout(timeoutId)
  }

  const responseText = await response.text()
  if (!response.ok) {
    const suffix = responseText.trim().length > 0 ? ` ${responseText.trim().slice(0, 300)}` : ""
    return { errors: { _form: [`Rubric suggestion request failed (${response.status}).${suffix}`] } }
  }

  let responseJson: unknown
  try {
    responseJson = JSON.parse(responseText)
  } catch {
    return { errors: { _form: ["Rubric suggestion service did not return valid JSON."] } }
  }

  const normalized = normalizeSuggestedRubricPayload(responseJson)
  if (!normalized) {
    return { errors: { _form: ["Rubric suggestion response format was not recognized."] } }
  }

  const parsed = rubricPayloadSchema.safeParse({
    questions: normalized.questions,
    overall_feedback: normalized.overall_feedback,
  })
  if (!parsed.success) {
    const diagnostics = parsed.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")

    return {
      errors: {
        _form: [
          `Suggested rubric payload did not pass validation.${diagnostics ? ` ${diagnostics}` : ""}`,
        ],
      },
    }
  }

  return {
    rubric: {
      questions: parsed.data.questions.map((question) => ({
        question_id: question.question_id,
        question_max_total:
          typeof question.question_max_total === "number"
            ? question.question_max_total
            : question.rubric_items.reduce((sum, item) => sum + item.max_score, 0),
        rubric_items: question.rubric_items.map((item) => ({
          criterion: item.criterion,
          explanation: item.explanation ?? "",
          max_score: item.max_score,
        })),
      })),
      overall_feedback: parsed.data.overall_feedback ?? "",
    },
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

  try {
    await uploadRubricJsonToS3({
      objectKey: buildRubricS3ObjectKey({ courseId, assignmentId }),
      rubricJson,
    })
  } catch {
    return { errors: { _form: ["Unable to save rubric JSON to S3. Check S3 configuration and try again."] } }
  }

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
