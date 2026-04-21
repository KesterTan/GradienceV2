"use server"

import { readFile } from "node:fs/promises"
import path from "node:path"
import { revalidatePath } from "next/cache"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import {
  assignmentRubricItems,
  assignments,
  courseMemberships,
  grades,
  regradeRequests,
  rubricScores,
  submissions,
} from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import {
  buildRubricS3Url,
  loadRubricJsonFromS3,
  loadSubmissionPdfFromS3,
} from "@/lib/s3-submissions"
import {
  flattenRubricItems,
  getRubricTotalMaxScore,
  parseRubricJson,
} from "@/lib/rubrics"

export type SubmissionGradeFormState = {
  message?: string
  appliedScores?: Array<{
    order: number
    pointsAwarded: number
    comment: string | null
  }>
  appliedOverallFeedback?: string | null
  errors?: {
    _form?: string[]
    scoresPayload?: string[]
    overallFeedback?: string[]
  }
}

type ScorePayloadItem = {
  order: number
  pointsAwarded: number
  comment: string | null
}

type ParsedScoresResult =
  | { error: string }
  | { items: ScorePayloadItem[] }

type AiGradingResult = {
  items: ScorePayloadItem[]
  overallFeedback: string | null
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
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

function parseScoresPayload(rawPayload: FormDataEntryValue | null): ParsedScoresResult {
  if (typeof rawPayload !== "string" || rawPayload.trim().length === 0) {
    return { error: "Scores payload is required." as const }
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(rawPayload)
  } catch {
    return { error: "Scores payload must be valid JSON." as const }
  }

  if (!Array.isArray(parsedPayload)) {
    return { error: "Scores payload must be an array." as const }
  }

  const items: ScorePayloadItem[] = []
  const seenOrders = new Set<number>()

  for (const item of parsedPayload) {
    if (!item || typeof item !== "object") {
      return { error: "Each score entry must be an object." as const }
    }

    const order = Number((item as { order?: unknown }).order)
    const pointsAwarded = Number((item as { pointsAwarded?: unknown }).pointsAwarded)
    const rawComment = (item as { comment?: unknown }).comment

    if (!Number.isInteger(order) || order < 0) {
      return { error: "Each score entry must include a valid rubric item order." as const }
    }

    if (seenOrders.has(order)) {
      return { error: "Duplicate rubric score entries are not allowed." as const }
    }
    seenOrders.add(order)

    if (!Number.isInteger(pointsAwarded) || pointsAwarded < 0) {
      return { error: "Each rubric score must be a whole number that is 0 or higher." as const }
    }

    items.push({
      order,
      pointsAwarded,
      comment: typeof rawComment === "string" ? rawComment : null,
    })
  }

  return { items }
}

function extractIntegerScore(value: unknown) {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return null
  }

  return Math.max(0, Math.trunc(num))
}

function parseAiResult(
  payload: unknown,
  flattenedItems: ReturnType<typeof flattenRubricItems>,
): AiGradingResult | { error: string } {
  if (!payload || typeof payload !== "object") {
    return { error: "AI grading service returned an invalid response payload." }
  }

  const response = payload as Record<string, unknown>
  const nestedResult =
    response.result && typeof response.result === "object"
      ? (response.result as Record<string, unknown>)
      : null

  const candidates: unknown[] = []

  const normalizeQuestionArray = (value: unknown) => {
    if (!Array.isArray(value)) return

    const normalized: Array<Record<string, unknown>> = []
    for (const rawQuestion of value) {
      if (!rawQuestion || typeof rawQuestion !== "object") continue
      const question = rawQuestion as Record<string, unknown>
      const questionId = typeof question.question_id === "string" ? question.question_id : undefined
      const rubricItems = question.rubric_items
      if (!Array.isArray(rubricItems)) continue

      for (const rawItem of rubricItems) {
        if (!rawItem || typeof rawItem !== "object") continue
        normalized.push({
          ...(rawItem as Record<string, unknown>),
          ...(questionId ? { question_id: questionId } : {}),
        })
      }
    }

    if (normalized.length > 0) {
      candidates.push(normalized)
    }
  }

  normalizeQuestionArray(response.questions)
  normalizeQuestionArray(nestedResult?.questions)

  const maybeArrays = [
    response.scores,
    response.rubricScores,
    response.rubric_scores,
    response.items,
    response.data,
    nestedResult?.scores,
    nestedResult?.rubric_scores,
    nestedResult?.items,
    nestedResult?.data,
  ]
  for (const value of maybeArrays) {
    if (Array.isArray(value)) {
      candidates.push(value)
    }
  }

  const scoreMap = new Map<number, number>()
  const commentMap = new Map<number, string>()

  for (const candidate of candidates) {
    for (const rawItem of candidate as unknown[]) {
      if (!rawItem || typeof rawItem !== "object") {
        continue
      }

      const item = rawItem as Record<string, unknown>
      const rawOrder =
        item.order ?? item.displayOrder ?? item.display_order ?? item.index ?? item.item_order
      const maybeScore =
        item.score_awarded ??
        item.pointsAwarded ??
        item.points_awarded ??
        item.score ??
        item.points ??
        item.value
      const maybeComment =
        typeof item.explanation === "string"
          ? item.explanation
          : typeof item.comment === "string"
          ? item.comment
          : typeof item.feedback === "string"
          ? item.feedback
          : null

      const parsedScore = extractIntegerScore(maybeScore)
      if (parsedScore === null) {
        continue
      }

      let order = Number(rawOrder)
      if (Number.isInteger(order) && order > 0 && order >= flattenedItems.length && order - 1 < flattenedItems.length) {
        order -= 1
      }

      if (Number.isInteger(order) && order >= 0 && order < flattenedItems.length) {
        scoreMap.set(order, parsedScore)
        if (maybeComment && maybeComment.trim().length > 0) {
          commentMap.set(order, maybeComment.trim())
        }
        continue
      }

      const questionId = typeof item.question_id === "string" ? item.question_id : null
      const rubricName =
        typeof item.rubric_name === "string"
          ? item.rubric_name
          : typeof item.rubricName === "string"
          ? item.rubricName
          : null
      const criterion = typeof item.criterion === "string" ? item.criterion : null

      const matchIndex = flattenedItems.findIndex((flattenedItem) => {
        const questionMatch = questionId ? flattenedItem.question_id === questionId : true
        const rubricMatch = rubricName ? flattenedItem.rubric_name === rubricName : true
        const criterionMatch = criterion ? flattenedItem.criterion === criterion : true
        return questionMatch && rubricMatch && criterionMatch
      })

      if (matchIndex >= 0) {
        scoreMap.set(matchIndex, parsedScore)
        if (maybeComment && maybeComment.trim().length > 0) {
          commentMap.set(matchIndex, maybeComment.trim())
        }
      }
    }
  }

  if (scoreMap.size === 0) {
    return { error: "AI grading response did not include rubric scores in a recognized format." }
  }

  const items = flattenedItems.map((rubricItem) => {
    const score = Math.min(scoreMap.get(rubricItem.order) ?? 0, rubricItem.max_score)
    return {
      order: rubricItem.order,
      pointsAwarded: score,
      comment: commentMap.get(rubricItem.order) ?? null,
    }
  })

  const overallFeedback =
    typeof response.overallFeedback === "string"
      ? response.overallFeedback.trim()
      : typeof response.overall_feedback === "string"
      ? response.overall_feedback.trim()
      : typeof response.feedback === "string"
      ? response.feedback.trim()
      : nestedResult && typeof nestedResult.overall_feedback === "string"
      ? nestedResult.overall_feedback.trim()
      : nestedResult && typeof nestedResult.feedback === "string"
      ? nestedResult.feedback.trim()
      : null

  return {
    items,
    overallFeedback: overallFeedback && overallFeedback.length > 0 ? overallFeedback : null,
  }
}

async function loadSubmissionPdfBuffer(fileUrl: string) {
  if (fileUrl.startsWith("s3://")) {
    return loadSubmissionPdfFromS3(fileUrl)
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      return null
    }

    const bytes = await response.arrayBuffer()
    return Buffer.from(bytes)
  }

  if (!fileUrl.startsWith("/")) {
    return null
  }

  const relative = fileUrl.replace(/^\/+/, "")
  const normalized = path.normalize(relative)
  const absolute = path.join(process.cwd(), "public", normalized)
  const publicRoot = path.join(process.cwd(), "public")

  if (!absolute.startsWith(publicRoot)) {
    return null
  }

  try {
    return await readFile(absolute)
  } catch {
    return null
  }
}

async function requestAiGrades({
  submissionId,
  assignmentId,
  submissionFileUrl,
  rubric,
  flattenedItems,
}: {
  submissionId: number
  assignmentId: number
  submissionFileUrl: string
  rubric: unknown
  flattenedItems: ReturnType<typeof flattenRubricItems>
}): Promise<AiGradingResult | { error: string }> {
  const submissionPdfBuffer = await loadSubmissionPdfBuffer(submissionFileUrl)
  if (!submissionPdfBuffer) {
    return { error: "Unable to load the submitted PDF for AI grading." }
  }

  const gradingApiUrl = process.env.AI_GRADING_API_URL || "http://3.93.76.195/grade"

  const payload = new FormData()
  payload.append(
    "file",
    new Blob([submissionPdfBuffer], { type: "application/pdf" }),
    `submission-${submissionId}.pdf`,
  )
  payload.append(
    "rubric_file",
    new Blob([JSON.stringify(rubric)], { type: "application/json" }),
    `rubric-${assignmentId}.json`,
  )
  payload.append("return_json_file", "true")

  let response: Response
  try {
    response = await fetch(gradingApiUrl, {
      method: "POST",
      body: payload,
    })
  } catch {
    return { error: "Unable to reach the AI grading service right now." }
  }

  const text = await response.text()
  if (!response.ok) {
    const suffix = text.trim().length > 0 ? ` ${text.trim().slice(0, 300)}` : ""
    return { error: `AI grading request failed (${response.status}).${suffix}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: "AI grading service did not return valid JSON." }
  }

  return parseAiResult(parsed, flattenedItems)
}

export async function saveSubmissionGradeAction(
  _prevState: SubmissionGradeFormState,
  formData: FormData,
): Promise<SubmissionGradeFormState> {
  const user = await requireAppUser()

  const rawCourseId = formData.get("courseId")
  const rawAssignmentId = formData.get("assignmentId")
  const rawSubmissionId = formData.get("submissionId")
  const courseId = typeof rawCourseId === "string" ? Number(rawCourseId) : NaN
  const assignmentId = typeof rawAssignmentId === "string" ? Number(rawAssignmentId) : NaN
  const submissionId = typeof rawSubmissionId === "string" ? Number(rawSubmissionId) : NaN

  if (!Number.isFinite(courseId) || !Number.isFinite(assignmentId) || !Number.isFinite(submissionId)) {
    return { errors: { _form: ["Invalid course, assignment, or submission id."] } }
  }

  const membership = await requireInstructorMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["Only instructors can grade submissions."] } }
  }

  const gradingMode = formData.get("gradingMode") === "ai" ? "ai" : "manual"

  let parsedScores: ParsedScoresResult = { items: [] }
  if (gradingMode === "manual") {
    parsedScores = parseScoresPayload(formData.get("scoresPayload"))
    if ("error" in parsedScores) {
      const errorMessage = parsedScores.error
      return { errors: { scoresPayload: [errorMessage] } }
    }
  }

  let overallFeedback = normalizeOptionalText(formData.get("overallFeedback"))

  const assignmentRows = await db
    .select({
      id: assignments.id,
      totalPoints: assignments.totalPoints,
      rubricJson: assignments.rubricJson,
      submissionId: submissions.id,
      fileUrl: submissions.fileUrl,
    })
    .from(assignments)
    .innerJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.courseId, courseId),
        eq(submissions.id, submissionId),
      ),
    )
    .limit(1)

  const assignmentRow = assignmentRows[0]
  if (!assignmentRow) {
    return { errors: { _form: ["Submission not found for this assessment."] } }
  }

  const rubric = parseRubricJson(assignmentRow.rubricJson)
  if (!rubric) {
    return { errors: { _form: ["Add and save a rubric before grading submissions."] } }
  }

  const rubricTotal = getRubricTotalMaxScore(rubric)

  const flattenedItems = flattenRubricItems(rubric)
  let scoreItems = parsedScores.items

  if (gradingMode === "ai") {
    const fileUrl = assignmentRow.fileUrl ? String(assignmentRow.fileUrl) : null
    if (!fileUrl) {
      return { errors: { _form: ["A submitted PDF is required for AI grading."] } }
    }

    const rubricUrl = buildRubricS3Url({ courseId, assignmentId })
    const rubricFromS3 = await loadRubricJsonFromS3(rubricUrl)
    const rubricPayload = rubricFromS3 ?? rubric

    const aiGradingResult = await requestAiGrades({
      submissionId,
      assignmentId,
      submissionFileUrl: fileUrl,
      rubric: rubricPayload,
      flattenedItems,
    })

    if ("error" in aiGradingResult) {
      return { errors: { _form: [aiGradingResult.error] } }
    }

    scoreItems = aiGradingResult.items
    if (!overallFeedback && aiGradingResult.overallFeedback) {
      overallFeedback = aiGradingResult.overallFeedback
    }
  }

  const scoresByOrder = new Map(scoreItems.map((item) => [item.order, item.pointsAwarded]))
  const commentsByOrder = new Map(scoreItems.map((item) => [item.order, item.comment ?? null]))
  const unknownOrders = scoreItems.filter((item) => item.order >= flattenedItems.length)
  if (unknownOrders.length > 0) {
    return { errors: { scoresPayload: ["Scores payload includes unknown rubric items."] } }
  }

  for (const item of flattenedItems) {
    const pointsAwarded = scoresByOrder.get(item.order) ?? 0
    if (pointsAwarded > item.max_score) {
      return {
        errors: {
          scoresPayload: [
            `Score for ${item.question_id} / ${item.rubric_name} cannot exceed ${item.max_score}.`,
          ],
        },
      }
    }
  }

  const totalScore = flattenedItems.reduce(
    (sum, item) => sum + (scoresByOrder.get(item.order) ?? 0),
    0,
  )

  try {
    await db.transaction(async (tx) => {
      let rubricItemRows = await tx
        .select({
          id: assignmentRubricItems.id,
          displayOrder: assignmentRubricItems.displayOrder,
        })
        .from(assignmentRubricItems)
        .where(eq(assignmentRubricItems.assignmentId, assignmentId))
        .orderBy(asc(assignmentRubricItems.displayOrder))

      if (rubricItemRows.length === 0) {
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

        rubricItemRows = await tx
          .select({
            id: assignmentRubricItems.id,
            displayOrder: assignmentRubricItems.displayOrder,
          })
          .from(assignmentRubricItems)
          .where(eq(assignmentRubricItems.assignmentId, assignmentId))
          .orderBy(asc(assignmentRubricItems.displayOrder))
      }

      if (rubricItemRows.length !== flattenedItems.length) {
        throw new Error("RUBRIC_OUT_OF_SYNC")
      }

      const existingGradeRows = await tx
        .select({ id: grades.id })
        .from(grades)
        .where(eq(grades.submissionId, submissionId))
        .limit(1)

      let gradeId = existingGradeRows[0]?.id

      if (gradeId) {
        await tx
          .update(grades)
          .set({
            gradedByMembershipId: membership.id,
            totalScore,
            overallFeedback,
            gradedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(grades.id, gradeId))
      } else {
        const insertedGradeRows = await tx
          .insert(grades)
          .values({
            submissionId,
            gradedByMembershipId: membership.id,
            totalScore,
            overallFeedback,
          })
          .returning({ id: grades.id })

        gradeId = insertedGradeRows[0]?.id
      }

      if (!gradeId) {
        throw new Error("GRADE_WRITE_FAILED")
      }

      await tx.delete(rubricScores).where(eq(rubricScores.gradeId, gradeId))

      await tx.insert(rubricScores).values(
        rubricItemRows.map((row, index) => ({
          gradeId,
          rubricItemId: row.id,
          pointsAwarded: scoresByOrder.get(index) ?? 0,
          comment: commentsByOrder.get(index) ?? null,
        })),
      )

      await tx
        .update(assignments)
        .set({
          totalPoints: rubricTotal,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(assignments.id, assignmentId))

      await tx
        .update(submissions)
        .set({
          status: "graded",
          ...(gradingMode === "ai" ? { aiProcessedStatus: "done" } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(submissions.id, submissionId))
    })
  } catch (error) {
    if (error instanceof Error && error.message === "RUBRIC_OUT_OF_SYNC") {
      return { errors: { _form: ["Rubric items are out of sync. Please resave the rubric before grading."] } }
    }

    return { errors: { _form: ["Unable to save grades right now. Please try again."] } }
  }

  const rawRegradeRequestId = formData.get("regradeRequestId")
  const regradeRequestId = typeof rawRegradeRequestId === "string" ? Number(rawRegradeRequestId) : NaN
  if (Number.isFinite(regradeRequestId) && regradeRequestId > 0) {
    await db
      .update(regradeRequests)
      .set({
        status: "resolved",
        resolvedByMembershipId: membership.id,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(regradeRequests.id, regradeRequestId))
  }

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}/submissions/${submissionId}`)

  return {
    message: gradingMode === "ai" ? "AI grades saved." : "Grades saved.",
    appliedScores: scoreItems.map((item) => ({
      order: item.order,
      pointsAwarded: item.pointsAwarded,
      comment: item.comment ?? null,
    })),
    appliedOverallFeedback: overallFeedback,
  }
}
