"use client"

import { useActionState, useMemo, useState } from "react"
import { updateRubricAction, type RubricFormState } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type RubricItem = {
  criterion: string
  rubric_name: string
  max_score: number
}

type RubricQuestion = {
  question_id: string
  question_name: string
  rubric_items: RubricItem[]
}

type RubricPayload = {
  questions: RubricQuestion[]
}

type RubricEditorProps = {
  courseId: number
  assignmentId: number
  initialRubric: RubricPayload | null
  canEdit: boolean
}

const emptyQuestion = (index: number): RubricQuestion => ({
  question_id: `Q${index + 1}`,
  question_name: "",
  rubric_items: [
    {
      criterion: "",
      rubric_name: "",
      max_score: 5,
    },
  ],
})

const initialState: RubricFormState = {}

export function RubricEditor({ courseId, assignmentId, initialRubric, canEdit }: RubricEditorProps) {
  const [state, formAction, pending] = useActionState(updateRubricAction, initialState)
  const [questions, setQuestions] = useState<RubricQuestion[]>(
    initialRubric?.questions?.length ? initialRubric.questions : [emptyQuestion(0)],
  )
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

  const payload = useMemo<RubricPayload>(() => ({ questions }), [questions])

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
            { criterion: "", rubric_name: "", max_score: 5 },
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
        {initialRubric.questions.map((question, index) => (
          <Card key={`${question.question_id}-${index}`}>
            <CardHeader>
              <CardTitle>{question.question_id}</CardTitle>
              <CardDescription>
                {question.question_name || "Untitled question"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.rubric_items.map((item, itemIndex) => (
                <div key={`${question.question_id}-${itemIndex}`} className="rounded-lg border p-3">
                  <p className="text-sm font-medium text-foreground">{item.criterion}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.rubric_name}</p>
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
              Max score: {totalMax}
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
            {itemCount} / 1000 items · Max score {totalMaxScore}
          </p>
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

      <div className="space-y-4">
        {questions.map((question, index) => {
          const questionMax = question.rubric_items.reduce((sum, item) => sum + item.max_score, 0)

          return (
            <Card key={`question-${index}`}>
              <CardHeader className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>Question</CardTitle>
                  <div className="text-xs text-muted-foreground">
                    Max score {questionMax}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
                  <div className="space-y-1">
                    <Label htmlFor={`question-name-${index}`}>Question name</Label>
                    <Input
                      id={`question-name-${index}`}
                      value={question.question_name}
                      className={errorClass(`questions.${index}.question_name`)}
                      aria-invalid={hasError(`questions.${index}.question_name`) || undefined}
                      onChange={(event) => updateQuestion(index, { question_name: event.target.value })}
                      placeholder="Question name"
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
                    <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
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
                        <Label htmlFor={`rubric-name-${index}-${itemIndex}`}>Rubric name</Label>
                        <Input
                          id={`rubric-name-${index}-${itemIndex}`}
                          value={item.rubric_name}
                          className={errorClass(
                            `questions.${index}.rubric_items.${itemIndex}.rubric_name`,
                          )}
                          aria-invalid={
                            hasError(`questions.${index}.rubric_items.${itemIndex}.rubric_name`) || undefined
                          }
                          onChange={(event) =>
                            updateItem(index, itemIndex, { rubric_name: event.target.value })
                          }
                          placeholder="Rubric name"
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
        <p className="text-xs text-muted-foreground">
          Max score: {totalMaxScore}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save rubric"}
        </Button>
      </div>
    </form>
  )
}
