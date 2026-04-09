import { z } from "zod"

export type RubricItem = {
  criterion: string
  rubric_name?: string
  score_awarded?: number
  explanation?: string | null
  max_score: number
}

export type RubricQuestion = {
  question_id: string
  question_name?: string
  question_total?: number
  question_max_total?: number
  rubric_items: RubricItem[]
}

export type RubricPayload = {
  questions: RubricQuestion[]
  total_score?: number
  total_max_score?: number
  overall_feedback?: string
}

const rubricItemSchema = z.object({
  criterion: z.string().trim().min(1, "Criterion is required"),
  rubric_name: z.string().trim().min(1, "Rubric name is required").optional(),
  score_awarded: z.number().min(0, "Score awarded cannot be negative").optional(),
  explanation: z.string().optional().nullable(),
  max_score: z.number().min(0, "Max score cannot be negative"),
})

const rubricQuestionSchema = z.object({
  question_id: z.string().trim().min(1, "Question id is required"),
  question_name: z.string().trim().min(1, "Question name is required").optional(),
  question_total: z.number().optional(),
  question_max_total: z.number().optional(),
  rubric_items: z.array(rubricItemSchema).min(1, "At least one rubric item is required"),
})

export const rubricPayloadSchema = z.object({
  questions: z.array(rubricQuestionSchema).min(1, "At least one question is required"),
  total_score: z.number().optional(),
  total_max_score: z.number().optional(),
  overall_feedback: z.string().optional(),
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
    question.rubric_items.map((item, itemIndex) => {
      const rubricName = item.rubric_name?.trim() || item.criterion
      const questionName = question.question_name?.trim() || question.question_id

      return {
        ...item,
        rubric_name: rubricName,
        question_id: question.question_id,
        question_name: questionName,
        order: order++,
        question_order: questionIndex,
        item_order: itemIndex,
      }
    }),
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
