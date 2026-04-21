import { z } from "zod"

export type AssignmentQuestion = {
  question_id: string
  question_text: string
  question_max_total: number
  is_extra_credit?: boolean
}

export type QuestionsPayload = {
  assignment_title: string
  course: string
  instructions_summary: string
  questions: AssignmentQuestion[]
}

const assignmentQuestionSchema = z.object({
  question_id: z.string().trim().min(1, "Question ID is required"),
  question_text: z.string().trim().min(1, "Question text is required"),
  question_max_total: z.number().min(0, "Max total cannot be negative"),
  is_extra_credit: z.boolean().optional(),
})

export const questionsPayloadSchema = z.object({
  assignment_title: z.string(),
  course: z.string(),
  instructions_summary: z.string(),
  questions: z.array(assignmentQuestionSchema).min(1, "At least one question is required"),
})

export function parseQuestionsJson(raw: unknown): QuestionsPayload | null {
  if (!raw) return null

  let parsed: unknown = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
  }

  const result = questionsPayloadSchema.safeParse(parsed)
  return result.success ? result.data : null
}
