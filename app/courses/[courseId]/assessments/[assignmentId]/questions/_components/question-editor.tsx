"use client"

import { useState } from "react"
import { saveQuestionsAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { QuestionsPayload, AssignmentQuestion } from "@/lib/questions"

type QuestionEditorProps = {
  courseId: number
  assignmentId: number
  initialPayload: QuestionsPayload | null
  canEdit: boolean
  assignmentTitle: string
  courseTitle: string
}

const emptyQuestion = (index: number): AssignmentQuestion => ({
  question_id: `Q${index + 1}`,
  question_text: "",
  question_max_total: 10,
  is_extra_credit: false,
})

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function printQuestionsPdf(assignmentTitle: string, courseTitle: string, questions: AssignmentQuestion[]) {
  const rows = questions
    .map(
      (q) =>
        `<div class="question">
          <div class="question-header">
            <span class="question-id">${escHtml(q.question_id)}</span>
            ${q.is_extra_credit ? '<span class="badge">Extra credit</span>' : ""}
            <span class="points">${q.question_max_total} pts</span>
          </div>
          <p class="question-text">${escHtml(q.question_text)}</p>
        </div>`,
    )
    .join("")

  const count = questions.length
  const html = [
    "<!DOCTYPE html><html><head><meta charset='utf-8'>",
    `<title>${escHtml(assignmentTitle)} \u2014 Questions</title>`,
    "<style>",
    "body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;font-size:14px}",
    "h1{font-size:20px;margin-bottom:4px}",
    ".meta{color:#555;font-size:13px;margin-bottom:32px}",
    ".question{border:1px solid #ddd;border-radius:6px;padding:16px;margin-bottom:16px}",
    ".question-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}",
    ".question-id{font-weight:bold;font-size:15px}",
    ".points{margin-left:auto;color:#555;font-size:12px}",
    ".badge{background:#fef3c7;color:#92400e;border-radius:99px;padding:1px 8px;font-size:11px}",
    ".question-text{margin:0;line-height:1.6}",
    "@media print{body{margin:20px}}",
    "</style></head><body>",
    `<h1>${escHtml(assignmentTitle)}</h1>`,
    `<p class="meta">Course: ${escHtml(courseTitle)} &nbsp;&middot;&nbsp; ${count} question${count !== 1 ? "s" : ""}</p>`,
    rows,
    "</body></html>",
  ].join("")

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, "_blank")
  if (win) {
    win.addEventListener("load", () => {
      win.print()
      URL.revokeObjectURL(url)
    })
  }
}

export function QuestionEditor({
  courseId,
  assignmentId,
  initialPayload,
  canEdit,
  assignmentTitle,
  courseTitle,
}: QuestionEditorProps) {
  const hasSavedQuestions = Boolean(initialPayload?.questions?.length)

  const [isEditing, setIsEditing] = useState(!hasSavedQuestions)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const [savedAssignmentTitle, setSavedAssignmentTitle] = useState(
    initialPayload?.assignment_title?.trim() || assignmentTitle,
  )
  const [savedCourse, setSavedCourse] = useState(
    initialPayload?.course?.trim() || courseTitle,
  )
  const [savedInstructionsSummary, setSavedInstructionsSummary] = useState(
    initialPayload?.instructions_summary ?? "",
  )

  const [assignmentTitleInput, setAssignmentTitleInput] = useState(savedAssignmentTitle)
  const [courseInput, setCourseInput] = useState(savedCourse)
  const [instructionsSummaryInput, setInstructionsSummaryInput] = useState(savedInstructionsSummary)

  const effectiveAssignmentTitle = savedAssignmentTitle || assignmentTitle
  const effectiveCourseTitle = savedCourse || courseTitle

  const [savedQuestions, setSavedQuestions] = useState<AssignmentQuestion[]>(
    () => initialPayload?.questions ?? [],
  )
  const [questions, setQuestions] = useState<AssignmentQuestion[]>(() => {
    if (!initialPayload?.questions?.length) return [emptyQuestion(0)]
    return initialPayload.questions.map((q) => ({
      question_id: q.question_id,
      question_text: q.question_text,
      question_max_total: q.question_max_total,
      is_extra_credit: q.is_extra_credit ?? false,
    }))
  })

  const importQuestionsJson = async (file: File) => {
    setImportError(null)

    const readString = (value: unknown) =>
      typeof value === "string" ? value.trim() : ""

    const readNumber = (value: unknown, fallback: number) => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed) || parsed < 0) return fallback
      return parsed
    }

    const normalizeQuestion = (rawQuestion: unknown, index: number): AssignmentQuestion | null => {
      if (!rawQuestion || typeof rawQuestion !== "object") return null
      const question = rawQuestion as Record<string, unknown>

      const questionId =
        readString(question.question_id) ||
        readString(question.id) ||
        (Number.isFinite(Number(question.question_number))
          ? `Q${Number(question.question_number)}`
          : `Q${index + 1}`)

      const questionText =
        readString(question.question_text) ||
        readString(question.text) ||
        readString(question.prompt) ||
        readString(question.question) ||
        readString(question.content)

      if (!questionText) return null

      const questionMaxTotal =
        readNumber(question.question_max_total, NaN) ||
        readNumber(question.max_points, NaN) ||
        readNumber(question.maxScore, NaN) ||
        readNumber(question.points, 10)

      const isExtraCredit =
        question.is_extra_credit === true ||
        question.extra_credit === true ||
        question.extraCredit === true

      return {
        question_id: questionId,
        question_text: questionText,
        question_max_total: questionMaxTotal,
        is_extra_credit: isExtraCredit,
      }
    }

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown

      let importedAssignmentTitle = ""
      let importedCourse = ""
      let importedInstructionsSummary = ""
      let rawQuestions: unknown = parsed

      if (!Array.isArray(parsed) && parsed && typeof parsed === "object") {
        const payload = parsed as Record<string, unknown>

        importedAssignmentTitle =
          readString(payload.assignment_title) ||
          readString(payload.assignmentTitle) ||
          readString(payload.title)

        importedCourse =
          readString(payload.course) ||
          readString(payload.course_title) ||
          readString(payload.courseTitle)

        importedInstructionsSummary =
          readString(payload.instructions_summary) ||
          readString(payload.instructionsSummary) ||
          readString(payload.description)

        if (Array.isArray(payload.questions)) {
          rawQuestions = payload.questions
        } else if (Array.isArray(payload.items)) {
          rawQuestions = payload.items
        } else if (payload.assignment && typeof payload.assignment === "object") {
          const assignmentPayload = payload.assignment as Record<string, unknown>
          if (!importedAssignmentTitle) {
            importedAssignmentTitle = readString(assignmentPayload.title)
          }
          if (!importedCourse) {
            importedCourse = readString(assignmentPayload.course)
          }
          if (!importedInstructionsSummary) {
            importedInstructionsSummary = readString(assignmentPayload.description)
          }
          if (Array.isArray(assignmentPayload.questions)) {
            rawQuestions = assignmentPayload.questions
          }
        }
      }

      if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
        setImportError("JSON must include a questions array (or be an array of questions).")
        return
      }

      const normalizedQuestions = rawQuestions
        .map((rawQuestion, index) => normalizeQuestion(rawQuestion, index))
        .filter((question): question is AssignmentQuestion => Boolean(question))

      if (normalizedQuestions.length === 0) {
        setImportError("No valid questions found in uploaded JSON.")
        return
      }

      setQuestions(normalizedQuestions)
      if (importedAssignmentTitle) setAssignmentTitleInput(importedAssignmentTitle)
      if (importedCourse) setCourseInput(importedCourse)
      if (importedInstructionsSummary) setInstructionsSummaryInput(importedInstructionsSummary)
      setFieldErrors({})
      setFormError(null)
    } catch {
      setImportError("Unable to parse JSON file.")
    }
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setFormError(null)
    setImportError(null)
    setFieldErrors({})

    // Snapshot questions at the moment of submit — no stale closure risk
    const snapshot = questions.map((q) => ({ ...q }))

    const formData = new FormData()
    formData.set("courseId", String(courseId))
    formData.set("assignmentId", String(assignmentId))
    formData.set(
      "questionsPayload",
      JSON.stringify({
        assignment_title: assignmentTitleInput,
        course: courseInput,
        instructions_summary: instructionsSummaryInput,
        questions: snapshot,
      }),
    )

    try {
      const result = await saveQuestionsAction({}, formData)
      if (result.errors) {
        setFormError(result.errors._form?.[0] ?? result.errors.questionsPayload?.[0] ?? null)
        setFieldErrors(result.errors.fieldErrors ?? {})
        return
      }
      // Success — update display state immediately from the snapshot we sent
      setSavedQuestions(result.savedQuestions ?? snapshot)
      setSavedAssignmentTitle(assignmentTitleInput)
      setSavedCourse(courseInput)
      setSavedInstructionsSummary(instructionsSummaryInput)
      setIsEditing(false)
    } catch {
      setFormError("An unexpected error occurred. Please try again.")
    } finally {
      setPending(false)
    }
  }

  const hasError = (path: string) => Boolean(fieldErrors[path]?.length)
  const errorClass = (path: string) =>
    hasError(path) ? "border-destructive focus-visible:ring-destructive" : undefined

  const updateQuestion = (index: number, update: Partial<AssignmentQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...update } : q)))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length)])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => {
      const next = prev.filter((_, i) => i !== index)
      let autoNum = 1
      return next.map((q) => {
        if (/^Q\d+$/.test(q.question_id)) {
          return { ...q, question_id: `Q${autoNum++}` }
        }
        return q
      })
    })
    setFieldErrors((prev) => {
      const next: Record<string, string[]> = {}
      for (const key of Object.keys(prev)) {
        const match = key.match(/^questions\.(\d+)\.(.+)$/)
        if (!match) {
          next[key] = prev[key]
          continue
        }
        const i = Number(match[1])
        if (i === index) continue
        const newKey = i > index ? `questions.${i - 1}.${match[2]}` : key
        next[newKey] = prev[key]
      }
      return next
    })
  }

  const enterEditMode = () => {
    setQuestions(
      savedQuestions.length ? savedQuestions.map((q) => ({ ...q })) : [emptyQuestion(0)],
    )
    setAssignmentTitleInput(savedAssignmentTitle)
    setCourseInput(savedCourse)
    setInstructionsSummaryInput(savedInstructionsSummary)
    setFormError(null)
    setImportError(null)
    setFieldErrors({})
    setIsEditing(true)
  }

  // ── Read-only view for students ──────────────────────────────────────────
  if (!canEdit) {
    if (!savedQuestions.length) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No questions yet</CardTitle>
          </CardHeader>
        </Card>
      )
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              printQuestionsPdf(effectiveAssignmentTitle, effectiveCourseTitle, savedQuestions)
            }
          >
            Download PDF
          </Button>
        </div>
        {savedQuestions.map((q, index) => (
          <QuestionCard key={`${q.question_id}-${index}`} question={q} />
        ))}
      </div>
    )
  }

  // ── Instructor view mode ─────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {savedQuestions.length} question{savedQuestions.length !== 1 ? "s" : ""} saved
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                printQuestionsPdf(effectiveAssignmentTitle, effectiveCourseTitle, savedQuestions)
              }
            >
              Download PDF
            </Button>
            <Button type="button" onClick={enterEditMode}>
              Edit questions
            </Button>
          </div>
        </div>
        {savedQuestions.map((q, index) => (
          <QuestionCard key={`${q.question_id}-${index}`} question={q} />
        ))}
      </div>
    )
  }

  // ── Instructor edit mode ─────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Questions</p>
          <p className="text-xs text-muted-foreground">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
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
              await importQuestionsJson(file)
              event.currentTarget.value = ""
            }}
          />
          {savedQuestions.length > 0 && (
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}
      {importError && <p className="text-sm text-destructive">{importError}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="assignment-title">Assignment title</Label>
              <Input
                id="assignment-title"
                value={assignmentTitleInput}
                onChange={(event) => setAssignmentTitleInput(event.target.value)}
                placeholder="Assignment title"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="course-title">Course</Label>
              <Input
                id="course-title"
                value={courseInput}
                onChange={(event) => setCourseInput(event.target.value)}
                placeholder="Course title"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="instructions-summary">Instructions summary</Label>
            <Textarea
              id="instructions-summary"
              rows={3}
              value={instructionsSummaryInput}
              onChange={(event) => setInstructionsSummaryInput(event.target.value)}
              placeholder="Optional instructions summary"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={`question-${index}`}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                >
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`qid-${index}`}>Question ID</Label>
                  <Input
                    id={`qid-${index}`}
                    value={question.question_id}
                    className={errorClass(`questions.${index}.question_id`)}
                    onChange={(e) => updateQuestion(index, { question_id: e.target.value })}
                    placeholder={`Q${index + 1}`}
                  />
                  {fieldErrors[`questions.${index}.question_id`]?.[0] && (
                    <p className="text-sm text-destructive">
                      {fieldErrors[`questions.${index}.question_id`][0]}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`qmax-${index}`}>Max points</Label>
                  <Input
                    id={`qmax-${index}`}
                    type="number"
                    min={0}
                    value={question.question_max_total}
                    className={errorClass(`questions.${index}.question_max_total`)}
                    onChange={(e) =>
                      updateQuestion(index, { question_max_total: Number(e.target.value) })
                    }
                  />
                  {fieldErrors[`questions.${index}.question_max_total`]?.[0] && (
                    <p className="text-sm text-destructive">
                      {fieldErrors[`questions.${index}.question_max_total`][0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor={`qtext-${index}`}>Question text</Label>
                <Textarea
                  id={`qtext-${index}`}
                  value={question.question_text}
                  className={errorClass(`questions.${index}.question_text`)}
                  rows={3}
                  onChange={(e) => updateQuestion(index, { question_text: e.target.value })}
                  placeholder="Enter the question prompt..."
                />
                {fieldErrors[`questions.${index}.question_text`]?.[0] && (
                  <p className="text-sm text-destructive">
                    {fieldErrors[`questions.${index}.question_text`][0]}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={`qec-${index}`}
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={question.is_extra_credit ?? false}
                  onChange={(e) => updateQuestion(index, { is_extra_credit: e.target.checked })}
                />
                <Label htmlFor={`qec-${index}`}>Extra credit</Label>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" className="w-full" onClick={addQuestion}>
          Add question
        </Button>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save questions"}
        </Button>
      </div>
    </form>
  )
}

function QuestionCard({ question }: { question: AssignmentQuestion }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{question.question_id}</CardTitle>
          {question.is_extra_credit && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              Extra credit
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {question.question_max_total} pts
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">{question.question_text}</p>
      </CardContent>
    </Card>
  )
}
