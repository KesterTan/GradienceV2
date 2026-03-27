"use client"

import { useActionState, useMemo, useState } from "react"
import { saveSubmissionGradeAction, type SubmissionGradeFormState } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SubmissionGrade, SubmissionGradeQuestion } from "@/lib/course-management"

type SubmissionGradeFormProps = {
  courseId: number
  assignmentId: number
  submissionId: number
  totalPoints: number
  rubricQuestions: SubmissionGradeQuestion[]
  initialGrade: SubmissionGrade | null
}

const initialState: SubmissionGradeFormState = {}

export function SubmissionGradeForm({
  courseId,
  assignmentId,
  submissionId,
  totalPoints,
  rubricQuestions,
  initialGrade,
}: SubmissionGradeFormProps) {
  const [state, formAction, pending] = useActionState(saveSubmissionGradeAction, initialState)
  const initialScores = useMemo(() => {
    const scores = new Map<number, number>()
    for (const score of initialGrade?.rubricScores ?? []) {
      scores.set(score.displayOrder - 1, score.pointsAwarded)
    }
    return scores
  }, [initialGrade])

  const [scores, setScores] = useState<Record<number, number>>(() => {
    const next: Record<number, number> = {}
    rubricQuestions.forEach((question) => {
      question.rubricItems.forEach((item) => {
        next[item.order] = initialScores.get(item.order) ?? 0
      })
    })
    return next
  })
  const [overallFeedback, setOverallFeedback] = useState(initialGrade?.overallFeedback ?? "")

  const scoresPayload = useMemo(
    () =>
      rubricQuestions.flatMap((question) =>
        question.rubricItems.map((item) => ({
          order: item.order,
          pointsAwarded: scores[item.order] ?? 0,
        })),
      ),
    [rubricQuestions, scores],
  )

  const totalScore = useMemo(
    () => scoresPayload.reduce((sum, item) => sum + item.pointsAwarded, 0),
    [scoresPayload],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade submission</CardTitle>
        <CardDescription>
          Score each rubric item. Question totals and the overall score are calculated automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="submissionId" value={submissionId} />
          <input type="hidden" name="scoresPayload" value={JSON.stringify(scoresPayload)} />

          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Total score:</span>{" "}
            <span className="font-semibold text-foreground">
              {totalScore} / {totalPoints}
            </span>
          </div>

          {state.errors?._form?.[0] && (
            <p className="text-sm text-destructive">{state.errors._form[0]}</p>
          )}
          {state.errors?.scoresPayload?.[0] && (
            <p className="text-sm text-destructive">{state.errors.scoresPayload[0]}</p>
          )}
          {state.message && <p className="text-sm text-emerald-700">{state.message}</p>}

          <div className="space-y-4">
            {rubricQuestions.map((question) => {
              const questionScore = question.rubricItems.reduce(
                (sum, item) => sum + (scores[item.order] ?? 0),
                0,
              )

              return (
                <div key={question.questionId} className="rounded-lg border">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{question.questionId}</p>
                      <p className="text-sm text-muted-foreground">{question.questionName}</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {questionScore} / {question.maxScore}
                    </p>
                  </div>

                  <div className="space-y-3 p-4">
                    {question.rubricItems.map((item) => (
                      <div
                        key={`${question.questionId}-${item.order}`}
                        className="grid gap-3 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.criterion}</p>
                          <p className="text-xs text-muted-foreground">{item.rubricName}</p>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="space-y-1">
                            <Label htmlFor={`score-${item.order}`}>Score</Label>
                            <Input
                              id={`score-${item.order}`}
                              type="number"
                              min={0}
                              max={item.maxScore}
                              value={scores[item.order] ?? 0}
                              onChange={(event) => {
                                const nextValue = Number(event.target.value)
                                const safeValue = Number.isFinite(nextValue)
                                  ? Math.min(Math.max(0, Math.trunc(nextValue)), item.maxScore)
                                  : 0

                                setScores((current) => ({
                                  ...current,
                                  [item.order]: safeValue,
                                }))
                              }}
                              className="w-24"
                            />
                          </div>
                          <p className="pb-2 text-xs text-muted-foreground">/ {item.maxScore}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="overallFeedback">Overall feedback</Label>
            <Textarea
              id="overallFeedback"
              name="overallFeedback"
              value={overallFeedback}
              onChange={(event) => setOverallFeedback(event.target.value)}
              placeholder="Optional summary feedback for the student"
              rows={5}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Only instructors can save or update grades.
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : initialGrade ? "Update grades" : "Save grades"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
