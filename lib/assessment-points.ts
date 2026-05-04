import type { AssignmentQuestion } from "@/lib/questions"
import type { RubricPayload } from "@/lib/rubrics"

export function getRubricQuestionPointMap(rubric: RubricPayload | null | undefined) {
  const pointMap = new Map<string, number>()

  for (const question of rubric?.questions ?? []) {
    const questionId = question.question_id.trim()
    if (!questionId) continue

    pointMap.set(
      questionId,
      question.rubric_items.reduce((sum, item) => sum + item.max_score, 0),
    )
  }

  return pointMap
}

export function syncQuestionMaxPointsWithRubric(
  questions: AssignmentQuestion[],
  rubric: RubricPayload | null | undefined,
) {
  const pointMap = getRubricQuestionPointMap(rubric)

  return questions.map((question) => {
    const rubricPoints = pointMap.get(question.question_id.trim())
    if (rubricPoints === undefined) {
      return question
    }

    return {
      ...question,
      question_max_total: rubricPoints,
    }
  })
}
