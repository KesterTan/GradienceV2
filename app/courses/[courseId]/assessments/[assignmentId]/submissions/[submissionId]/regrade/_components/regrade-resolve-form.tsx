"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SubmissionGrade, SubmissionGradeQuestion } from "@/lib/course-management"

type Props = {
  courseId: number
  assignmentId: number
  submissionId: number
  regradeRequestId: number
  totalPoints: number
  rubricQuestions: SubmissionGradeQuestion[]
  initialGrade: SubmissionGrade | null
}

export function RegradeResolveForm({
  courseId,
  assignmentId,
  submissionId,
  regradeRequestId,
  totalPoints,
  rubricQuestions,
  initialGrade,
}: Props) {
  const router = useRouter()

  const initialScores = useMemo(() => {
    const map = new Map<number, number>()
    for (const score of initialGrade?.rubricScores ?? []) {
      map.set(score.displayOrder - 1, score.pointsAwarded)
    }
    return map
  }, [initialGrade])

  const [scores, setScores] = useState<Record<number, number>>(() => {
    const next: Record<number, number> = {}
    rubricQuestions.forEach((q) => q.rubricItems.forEach((item) => {
      next[item.order] = initialScores.get(item.order) ?? 0
    }))
    return next
  })

  const [itemComments, setItemComments] = useState<Record<number, string>>(() => {
    const next: Record<number, string> = {}
    for (const score of initialGrade?.rubricScores ?? []) {
      next[score.displayOrder - 1] = score.comment ?? ""
    }
    return next
  })

  const [overallFeedback, setOverallFeedback] = useState(initialGrade?.overallFeedback ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scoresPayload = useMemo(
    () =>
      rubricQuestions.flatMap((q) =>
        q.rubricItems.map((item) => ({
          order: item.order,
          pointsAwarded: scores[item.order] ?? 0,
          comment: itemComments[item.order] ?? null,
        })),
      ),
    [itemComments, rubricQuestions, scores],
  )

  const totalScore = useMemo(
    () => scoresPayload.reduce((sum, item) => sum + item.pointsAwarded, 0),
    [scoresPayload],
  )

  async function handleResolve() {
    setPending(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/submissions/${submissionId}/regrade`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regradeRequestId,
            scores: scoresPayload,
            overallFeedback: overallFeedback.trim() || null,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? "Failed to resolve regrade.")
      } else {
        router.push(`/courses/${courseId}/assessments/${assignmentId}`)
      }
    } catch {
      setError("Failed to resolve regrade. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update grade &amp; resolve</CardTitle>
        <CardDescription>
          Edit scores below, then click Resolve to save the updated grade and close the request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
          <span className="text-muted-foreground">Total score:</span>{" "}
          <span className="font-semibold text-foreground">
            {totalScore} / {totalPoints}
          </span>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

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
                    <div key={`${question.questionId}-${item.order}`} className="grid gap-3">
                      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
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
                              onChange={(e) => {
                                const next = Number(e.target.value)
                                const safe = Number.isFinite(next)
                                  ? Math.min(Math.max(0, Math.trunc(next)), item.maxScore)
                                  : 0
                                setScores((cur) => ({ ...cur, [item.order]: safe }))
                              }}
                              className="w-24"
                            />
                          </div>
                          <p className="pb-2 text-xs text-muted-foreground">/ {item.maxScore}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`comment-${item.order}`}>Explanation</Label>
                        <Textarea
                          id={`comment-${item.order}`}
                          value={itemComments[item.order] ?? ""}
                          onChange={(e) =>
                            setItemComments((cur) => ({ ...cur, [item.order]: e.target.value }))
                          }
                          placeholder="Optional explanation for this rubric item"
                          rows={2}
                        />
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
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Optional summary feedback for the student"
            rows={4}
          />
        </div>

        <Button onClick={handleResolve} disabled={pending} className="w-full">
          {pending ? "Resolving..." : "Resolve regrade"}
        </Button>
      </CardContent>
    </Card>
  )
}
