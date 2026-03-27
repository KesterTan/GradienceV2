"use server"

import { revalidatePath } from "next/cache"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import {
  assignmentRubricItems,
  assignments,
  courseMemberships,
  grades,
  rubricScores,
  submissions,
} from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import {
  flattenRubricItems,
  getRubricTotalMaxScore,
  parseRubricJson,
} from "@/lib/rubrics"

export type SubmissionGradeFormState = {
  message?: string
  errors?: {
    _form?: string[]
    scoresPayload?: string[]
    overallFeedback?: string[]
  }
}

type ScorePayloadItem = {
  order: number
  pointsAwarded: number
}

type ParsedScoresResult =
  | { error: string }
  | { items: ScorePayloadItem[] }

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

    items.push({ order, pointsAwarded })
  }

  return { items }
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

  const parsedScores = parseScoresPayload(formData.get("scoresPayload"))
  if ("error" in parsedScores) {
    const errorMessage = parsedScores.error
    return { errors: { scoresPayload: [errorMessage] } }
  }

  const overallFeedback = normalizeOptionalText(formData.get("overallFeedback"))

  const assignmentRows = await db
    .select({
      id: assignments.id,
      totalPoints: assignments.totalPoints,
      rubricJson: assignments.rubricJson,
      submissionId: submissions.id,
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
  const scoresByOrder = new Map(parsedScores.items.map((item) => [item.order, item.pointsAwarded]))
  const unknownOrders = parsedScores.items.filter((item) => item.order >= flattenedItems.length)
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
          comment: null,
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

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}/submissions/${submissionId}`)

  return { message: "Grades saved." }
}
