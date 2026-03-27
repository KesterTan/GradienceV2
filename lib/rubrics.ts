import { z } from "zod"

export type RubricItem = {
  criterion: string
  rubric_name: string
  max_score: number
}

export type RubricQuestion = {
  question_id: string
  question_name: string
  rubric_items: RubricItem[]
}

export type RubricPayload = {
  questions: RubricQuestion[]
}

const rubricItemSchema = z.object({
  criterion: z.string().trim().min(1, "Criterion is required"),
  rubric_name: z.string().trim().min(1, "Rubric name is required"),
  max_score: z.number().int("Max score must be a whole number").min(0, "Max score cannot be negative"),
})

const rubricQuestionSchema = z.object({
  question_id: z.string().trim().min(1, "Question id is required"),
  question_name: z.string().trim().min(1, "Question name is required"),
  rubric_items: z.array(rubricItemSchema).min(1, "At least one rubric item is required"),
})

export const rubricPayloadSchema = z.object({
  questions: z.array(rubricQuestionSchema).min(1, "At least one question is required"),
})

export type FlattenedRubricItem = RubricItem &
  Pick<RubricQuestion, "question_id" | "question_name"> & {
    order: number
    question_order: number
    item_order: number
  }

export function parseRubricJson(raw: unknown): RubricPayload | null {
  if (!raw) return null

  let parsed: unknown = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
  }

  const result = rubricPayloadSchema.safeParse(parsed)
  return result.success ? result.data : null
}

export function flattenRubricItems(rubric: RubricPayload): FlattenedRubricItem[] {
  let order = 0

  return rubric.questions.flatMap((question, questionIndex) =>
    question.rubric_items.map((item, itemIndex) => ({
      ...item,
      question_id: question.question_id,
      question_name: question.question_name,
      order: order++,
      question_order: questionIndex,
      item_order: itemIndex,
    })),
  )
}

export function getRubricItemCount(rubric: RubricPayload) {
  return rubric.questions.reduce((sum, question) => sum + question.rubric_items.length, 0)
}

export function getRubricTotalMaxScore(rubric: RubricPayload) {
  return flattenRubricItems(rubric).reduce((sum, item) => sum + item.max_score, 0)
}

export function buildRubricFieldErrors(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {}

  for (const issue of error.issues) {
    if (!issue.path.length) continue
    const key = issue.path.join(".")
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
  }

  return fieldErrors
}
