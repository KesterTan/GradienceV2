"use client"

import { useActionState, useMemo, useState } from "react"
import { updateRubricAction, type RubricFormState } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RubricItem = {
  criterion: string
  explanation: string
  max_score: number
}

type RubricQuestion = {
  question_id: string
  question_max_total: number
  rubric_items: RubricItem[]
}

type RubricPayload = {
  questions: RubricQuestion[]
  total_max_score: number
  overall_feedback: string
}

type RubricEditorProps = {
  courseId: number
  assignmentId: number
  initialRubric: RubricPayload | null
  canEdit: boolean
}

const emptyQuestion = (index: number): RubricQuestion => ({
  question_id: `Q${index + 1}`,
  question_max_total: 5,
  rubric_items: [
    {
      criterion: "",
      explanation: "",
      max_score: 5,
    },
  ],
})

const initialState: RubricFormState = {}

export function RubricEditor({ courseId, assignmentId, initialRubric, canEdit }: RubricEditorProps) {
  const [state, formAction, pending] = useActionState(updateRubricAction, initialState)
  const [importError, setImportError] = useState<string | null>(null)
  const [overallFeedback, setOverallFeedback] = useState<string>(initialRubric?.overall_feedback ?? "")
  const [questions, setQuestions] = useState<RubricQuestion[]>(() => {
    if (!initialRubric?.questions?.length) {
      return [emptyQuestion(0)]
    }

    return initialRubric.questions.map((question, questionIndex) => {
      const rubricItems = question.rubric_items.map((item) => ({
        criterion: item.criterion,
        max_score: item.max_score,
        explanation: typeof item.explanation === "string" ? item.explanation : "",
      }))

      const questionMaxTotal = rubricItems.reduce((sum, item) => sum + item.max_score, 0)

      return {
        question_id: question.question_id || `Q${questionIndex + 1}`,
        question_max_total:
          typeof question.question_max_total === "number"
            ? question.question_max_total
            : questionMaxTotal,
        rubric_items: rubricItems,
      }
    })
  })
  const fieldErrors = state.errors?.fieldErrors ?? {}

  const hasError = (path: string) => Boolean(fieldErrors[path]?.length)
  const errorClass = (path: string) =>
    hasError(path) ? "border-destructive focus-visible:ring-destructive" : undefined

  const itemCount = useMemo(
    () => questions.reduce((sum, q) => sum + q.rubric_items.length, 0),
    [questions],
  )

  const totalMaxScore = useMemo(
    () => questions.reduce((sum, question) => sum + question.rubric_items.reduce((sub, item) => sub + item.max_score, 0), 0),
    [questions],
  )

  const payload = useMemo<RubricPayload>(
    () => ({
      questions: questions.map((question) => ({
        ...question,
        question_max_total: question.rubric_items.reduce((sum, item) => sum + item.max_score, 0),
      })),
      total_max_score: totalMaxScore,
      overall_feedback: overallFeedback,
    }),
    [overallFeedback, questions, totalMaxScore],
  )

  const importRubricJson = async (file: File) => {
    setImportError(null)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as { questions?: unknown; overall_feedback?: unknown }

      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.questions)) {
        setImportError("JSON must include a questions array.")
        return
      }

      const normalizedQuestions: RubricQuestion[] = []

      for (let qIndex = 0; qIndex < parsed.questions.length; qIndex++) {
        const rawQuestion = parsed.questions[qIndex]
        if (!rawQuestion || typeof rawQuestion !== "object") {
          setImportError(`Question ${qIndex + 1} is invalid.`)
          return
        }

        const question = rawQuestion as {
          question_id?: unknown
          rubric_items?: unknown
          question_max_total?: unknown
        }

        if (!Array.isArray(question.rubric_items) || question.rubric_items.length === 0) {
          setImportError(`Question ${qIndex + 1} must include at least one rubric item.`)
          return
        }

        const normalizedItems: RubricItem[] = []

        for (let i = 0; i < question.rubric_items.length; i++) {
          const rawItem = question.rubric_items[i]
          if (!rawItem || typeof rawItem !== "object") {
            setImportError(`Question ${qIndex + 1}, rubric item ${i + 1} is invalid.`)
            return
          }

          const item = rawItem as {
            criterion?: unknown
            max_score?: unknown
            explanation?: unknown
          }

          const criterion = typeof item.criterion === "string" ? item.criterion.trim() : ""
          const maxScore = Number(item.max_score)

          if (!criterion) {
            setImportError(`Question ${qIndex + 1}, rubric item ${i + 1} is missing criterion.`)
            return
          }

          if (!Number.isFinite(maxScore) || maxScore < 0) {
            setImportError(`Question ${qIndex + 1}, rubric item ${i + 1} has invalid max_score.`)
            return
          }

          normalizedItems.push({
            criterion,
            max_score: maxScore,
            explanation: typeof item.explanation === "string" ? item.explanation : "",
          })
        }

        const derivedQuestionMax = normalizedItems.reduce((sum, item) => sum + item.max_score, 0)

        normalizedQuestions.push({
          question_id:
            typeof question.question_id === "string" && question.question_id.trim().length > 0
              ? question.question_id.trim()
              : `Q${qIndex + 1}`,
          question_max_total:
            typeof question.question_max_total === "number"
              ? question.question_max_total
              : derivedQuestionMax,
          rubric_items: normalizedItems,
        })
      }

      setQuestions(normalizedQuestions)
      if (typeof parsed.overall_feedback === "string") {
        setOverallFeedback(parsed.overall_feedback)
      }
    } catch {
      setImportError("Unable to parse JSON file.")
    }
  }

  const updateQuestion = (index: number, update: Partial<RubricQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...update } : q)))
  }

  const updateItem = (qIndex: number, itemIndex: number, update: Partial<RubricItem>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          rubric_items: q.rubric_items.map((item, j) => (j === itemIndex ? { ...item, ...update } : item)),
        }
      }),
    )
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const addItem = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          rubric_items: [
            ...q.rubric_items,
            { criterion: "", explanation: "", max_score: 5 },
          ],
        }
      }),
    )
  }

  const removeItem = (qIndex: number, itemIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return { ...q, rubric_items: q.rubric_items.filter((_, j) => j !== itemIndex) }
      }),
    )
  }

  const renderReadOnly = () => {
    if (!initialRubric || initialRubric.questions.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No rubric yet</CardTitle>
            <CardDescription>The instructor has not added a rubric for this assessment.</CardDescription>
          </CardHeader>
        </Card>
      )
    }

    const totalMax = initialRubric.questions.reduce(
      (sum, question) => sum + question.rubric_items.reduce((sub, item) => sub + item.max_score, 0),
      0,
    )

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Total points</CardTitle>
            <CardDescription>{totalMax}</CardDescription>
          </CardHeader>
        </Card>

        {initialRubric.questions.map((question, index) => (
          <Card key={`${question.question_id}-${index}`}>
            <CardHeader>
              {/** Keep totals derived from items so old/new payloads both render correctly. */}
              {(() => {
                const questionMaxTotal = question.rubric_items.reduce((sum, item) => sum + item.max_score, 0)

                return (
                  <>
                    <CardTitle>{question.question_id}</CardTitle>
                    <CardDescription>
                      Max total: {questionMaxTotal}
                    </CardDescription>
                  </>
                )
              })()}
            </CardHeader>
            <CardContent className="space-y-3">
              {question.rubric_items.map((item, itemIndex) => (
                <div key={`${question.question_id}-${itemIndex}`} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-foreground">{item.criterion}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.explanation}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Max score: {item.max_score}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
            <CardDescription>
              Total points: {totalMax}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!canEdit) {
    return renderReadOnly()
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="rubricPayload" value={JSON.stringify(payload)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Rubric items</p>
          <p className="text-xs text-muted-foreground">
            {itemCount} / 1000 items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept="application/json,.json"
            className="max-w-xs"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0]
              if (!file) return
              await importRubricJson(file)
              event.currentTarget.value = ""
            }}
          />
        </div>
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total points</p>
          <p className="text-lg font-semibold text-foreground">{totalMaxScore}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addQuestion}
          disabled={itemCount >= 1000}
        >
          Add question
        </Button>
      </div>

      {state.errors?.rubricPayload?.[0] && (
        <p className="text-sm text-destructive">{state.errors.rubricPayload[0]}</p>
      )}
      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}
      {importError && <p className="text-sm text-destructive">{importError}</p>}

      <div className="space-y-4">
        {questions.map((question, index) => {
          const questionMax = question.rubric_items.reduce((sum, item) => sum + item.max_score, 0)

          return (
            <Card key={`question-${index}`}>
              <CardHeader className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Question</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    Max total {questionMax}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-1">
                    <Label htmlFor={`question-id-${index}`}>Question id</Label>
                    <Input
                      id={`question-id-${index}`}
                      value={question.question_id}
                      className={errorClass(`questions.${index}.question_id`)}
                      aria-invalid={hasError(`questions.${index}.question_id`) || undefined}
                      onChange={(event) => updateQuestion(index, { question_id: event.target.value })}
                      placeholder={`Q${index + 1}`}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length === 1}
                    >
                      Delete question
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {question.rubric_items.map((item, itemIndex) => (
                  <div key={`item-${index}-${itemIndex}`} className="rounded-lg border p-3">
                    <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
                      <div className="space-y-1">
                        <Label htmlFor={`criterion-${index}-${itemIndex}`}>Criterion</Label>
                        <Input
                          id={`criterion-${index}-${itemIndex}`}
                          value={item.criterion}
                          className={errorClass(
                            `questions.${index}.rubric_items.${itemIndex}.criterion`,
                          )}
                          aria-invalid={
                            hasError(`questions.${index}.rubric_items.${itemIndex}.criterion`) || undefined
                          }
                          onChange={(event) =>
                            updateItem(index, itemIndex, { criterion: event.target.value })
                          }
                          placeholder="e.g. Correctness"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`max-${index}-${itemIndex}`}>Max score</Label>
                        <Input
                          id={`max-${index}-${itemIndex}`}
                          type="number"
                          min={0}
                          value={item.max_score}
                          className={errorClass(
                            `questions.${index}.rubric_items.${itemIndex}.max_score`,
                          )}
                          aria-invalid={
                            hasError(`questions.${index}.rubric_items.${itemIndex}.max_score`) || undefined
                          }
                          onChange={(event) =>
                            updateItem(index, itemIndex, { max_score: Number(event.target.value) })
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeItem(index, itemIndex)}
                          disabled={question.rubric_items.length === 1}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <Label htmlFor={`explanation-${index}-${itemIndex}`}>Explanation</Label>
                      <Input
                        id={`explanation-${index}-${itemIndex}`}
                        value={item.explanation}
                        onChange={(event) =>
                          updateItem(index, itemIndex, { explanation: event.target.value })
                        }
                        placeholder="Explanation"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addItem(index)}
                    disabled={itemCount >= 1000}
                  >
                    Add rubric item
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {question.rubric_items.length} items
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <div className="rounded-md bg-muted/20 px-3 py-2 text-sm text-foreground">
          Total points: <span className="font-semibold">{totalMaxScore}</span>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save rubric"}
        </Button>
      </div>
    </form>
  )
}
