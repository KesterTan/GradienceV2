# Development Specification — PRs 53, 55, 59, 63

## 0) Scope / PR summaries
- **Tracking issue (created before dev spec):** https://github.com/KesterTan/GradienceV2/issues/71

### PR #53
- **Title:** Add instructor question editor with S3 JSON persistence
- **Author:** vickyc2266
- **URL:** https://github.com/KesterTan/GradienceV2/pull/53
- **Linked issues:** None

**Summary:**
## Summary
- Instructors can now add, edit, and delete questions for an assignment one at a time via a dedicated `/questions` page
- Questions are saved to Postgres (`questions_json` JSONB column) and mirrored to S3 as structured JSON
- After saving, the UI switches to a finalized view mode with an "Edit questions" / "Download PDF" flow

## Linked Issue
- Closes https://github.com/orgs/GradientV1/projects/1/views/1?pane=issue&itemId=178188673&issue=GradientV1%7CGradient%7C5

## Changes

### Backend
- `db/schema.ts` + `db/schema.sql`: added `questions_json` JSONB column to `assignments` table
- `lib/questions.ts`: new `AssignmentQuestion` / `QuestionsPayload` types + Zod validation schema
- `lib/s3-submissions.ts`: added `buildQuestionsS3ObjectKey` + `uploadQuestionsJsonToS3`
- `lib/course-management.ts`: added `AssessmentQuestionsDetail` type + `getAssessmentQuestionsForMember` query
- `app/.../questions/actions.ts`: `saveQuestionsAction` — auth, grader-membership check, Zod validation, S3 upload, DB write

### Frontend
- `app/.../assessments/[assignmentId]/page.tsx`: added "Questions" button alongside "Rubric"
- `app/.../questions/page.tsx`: new server page — fetches questions, gates edit on instructor role
- `app/.../questions/_components/question-editor.tsx`: instructor edit/view mode toggle, add/delete questions, extra-credit checkbox, Download PDF, direct server action call (no `useActionState`) for reliable state transitions

### Tests
- All 70 Vitest tests passing
- All 110 Jest tests passing

## Risks / Assumptions
- `npm run db:apply` must be run to add the `questions_json` column before deploying
- PDF download uses browser print dialog (`window.print`) — no server-side PDF generation
- Questions page manages display state client-side after initial load; no `revalidatePath` on the questions route to avoid router refresh race conditions

## Validation
- [x] Build passes (`npm run build`)
- [x] S3 JSON verified via `aws s3 cp` — correct structure including `is_extra_credit` flags
- [x] Vitest: 70/70 passing
- [x] Jest: 110/110 passing
- [ ] Full HAT run on staging

<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **New Features**
  * Added a "Questions" tab on assessment pages for creating and managing assignment questions.
  * Instructors can add/edit/delete questions, set point values and extra-credit, and save changes (persisted server-side).
  * Students see finalized questions in read-only view.
  * "Download PDF" available to print/export questions.

* **Tests**
  * UI and server-side tests added covering editor behavior, validation, persistence, and PDF export.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### PR #55
- **Title:** Add tests for assignment questions feature
- **Author:** vickyc2266
- **URL:** https://github.com/KesterTan/GradienceV2/pull/55
- **Linked issues:** None

**Summary:**
## Summary
- Adds automated test coverage for the assignment questions feature (issue #54)
- Covers server action, Zod schema validation, and QuestionEditor component

## Linked Issue
- Closes #54

## Changes
### Backend
- No backend changes

### Frontend
- No frontend changes

### Tests
- `tests/lib/questions.test.ts`: 21 Vitest tests for `questionsPayloadSchema` (valid payloads, empty question_text/id, negative max points, empty questions array, is_extra_credit variants) and `parseQuestionsJson` (null, undefined, invalid JSON, schema failures, valid object and string)
- `tests/assessments/save-questions-action.test.ts`: 16 Vitest tests for `saveQuestionsAction` covering all paths — invalid IDs, permission denial (non-grader), missing/invalid payload, field validation errors, assignment not found, S3 failure, success with correct S3 key and enriched payload, DB update, revalidatePath
- `tests/assessments/question-editor.jest.test.tsx`: 13 Jest/jsdom tests for QuestionEditor — student read-only view, "No questions yet" card, Add question button at the bottom, extra-credit checkbox toggle, post-save transition to view mode

## Risks / Assumptions
- Tests mock db and S3 — no real AWS/Postgres calls needed
- Jest component tests require jsdom (pragma set per file)

## Validation
- [x] `npm test` — 107 Vitest tests pass
- [x] `npm run test:jest` — 126 Jest tests pass
- [ ] Manual review of test coverage


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

* **New Features**
  * Instructors can add, edit, delete, reorder, print (PDF), and save assignment questions; students see questions read-only.
  * A "Questions" button was added to assessment action toolbars and a dedicated Questions page/view was introduced.

* **Bug Fixes / Persistence**
  * Questions are persisted with assignments and reliably served after saving; permission checks prevent unauthorized edits.

* **Tests**
  * New unit and UI tests cover editor UI, validation, save action, parsing, S3 persistence, and error paths.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### PR #59
- **Title:** confirmed that students can and only have view permission on questions
- **Author:** vickyc2266
- **URL:** https://github.com/KesterTan/GradienceV2/pull/59
- **Linked issues:** None

**Summary:**
## Summary
- Student read-only questions view was already fully implemented in PR #53 (QuestionEditor canEdit=false, Questions link visible to all members, getAssessmentQuestionsForMember handles student membership)
- This branch publishes the tracking user story (issue #58) and confirms the implementation meets all acceptance criteria
- No new feature code was required — this PR closes the story and documents the verification

## Linked Issue
- Closes #58

## Changes
### Backend
- No new backend changes — `getAssessmentQuestionsForMember` already returns `questionsJson` and sets `viewerRole='Student'` for student memberships via the existing SQL CASE expression

### Frontend
- No new frontend changes — `QuestionEditor` canEdit=false read-only mode with Download PDF button was fully implemented in PR #53
- The Questions link on the assessment detail page was already not gated by `isInstructor`, so no change needed

### Tests
- No automated test changes in this story — test coverage for the student view is tracked in a separate testing story
- Manual end-to-end verification of the student flow was completed

## Risks / Assumptions
- Questions are only visible to students once the instructor has explicitly saved them — no draft/preview mode for unpublished questions
- PDF is generated client-side via window.print() — output quality depends on the browser's print-to-PDF capability
- If assignments.questions_json contains corrupted data (non-null but fails schema parse), parseQuestionsJson returns null and the student silently sees "No questions yet" — a follow-up story should add an explicit error state
- Student access control relies on getAssessmentQuestionsForMember correctly checking active course membership

## Validation
- [x] Manual verification completed — student flow confirmed end-to-end in browser

### PR #63
- **Title:** Add automated tests for student read-only questions view (#62)
- **Author:** vickyc2266
- **URL:** https://github.com/KesterTan/GradienceV2/pull/63
- **Linked issues:** None

**Summary:**
## Summary
- Adds comprehensive Vitest and Jest test coverage for the student read-only questions view feature (shipped in PR #53, tracked in issue #62)
- New Vitest suite tests `getAssessmentQuestionsForMember` — student membership returns `viewerRole='Student'`, non-member returns null, all scalar fields mapped correctly
- New Vitest suite tests `AssessmentQuestionsPage` server component — notFound for non-members and invalid IDs, `canEdit=false` passed for students, `canEdit=true` for instructors, "No questions yet" rendered when student has no questions
- Existing Jest suite extended: Download PDF calls `window.open`, no Save/Cancel/Edit/Delete buttons for students, multi-question card rendering
- Existing Vitest action suite extended: explicit student-role mutation rejection, DB write guard

## Linked Issue
- Closes #62

## Changes
### Backend
- No backend changes

### Frontend
- No frontend changes

### Tests
- **New:** `tests/lib/get-assessment-questions-for-member.test.ts` — 9 Vitest tests for the DB query function (student/instructor/non-member membership, field mapping, questionsJson)
- **New:** `tests/assessments/assessment-questions-page.test.ts` — 10 Vitest tests for the server component (notFound paths, canEdit routing, "No questions yet" vs QuestionEditor rendering)
- **Updated:** `tests/assessments/question-editor.jest.test.tsx` — 6 new `canEdit=false` tests: Download PDF → `window.open`, no edit buttons for students, multi-question rendering, question field visibility
- **Updated:** `tests/assessments/save-questions-action.test.ts` — 2 new tests: student-role mutation rejection, no DB write for non-graders

## Risks / Assumptions
- Two pre-existing integration tests (`members.test.ts`, `remove-member.test.ts`) require a live local Postgres connection and fail without it — these were failing before this branch and are unaffected
- `window.open` and `URL.createObjectURL` are mocked in Jest `beforeEach` since jsdom does not provide these browser APIs

## Validation
- [x] Tests run — 120 Vitest + 133 Jest unit/component tests pass
- [ ] Manual verification completed


<!-- This is an auto-generated comment: release notes by coderabbit.ai -->
## Summary by CodeRabbit

## Tests
- Expanded test coverage for assessment question workflows, including permission validation, role-based interface behavior, and question rendering across different user access levels.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

---
## 1) Diff Summary

```diff


# Diff for PR 53

diff --git a/app/courses/[courseId]/assessments/[assignmentId]/page.tsx b/app/courses/[courseId]/assessments/[assignmentId]/page.tsx
index 93b9332..c30bda9 100644
--- a/app/courses/[courseId]/assessments/[assignmentId]/page.tsx
+++ b/app/courses/[courseId]/assessments/[assignmentId]/page.tsx
@@ -73,6 +73,11 @@ export default async function AssessmentPage({
             </p>
           </div>
           <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
+            <Button asChild className="w-full sm:w-auto" variant="outline">
+              <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/questions`}>
+                Questions
+              </Link>
+            </Button>
             <Button asChild className="w-full sm:w-auto" variant="outline">
               <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}/rubric`}>
                 Rubric
diff --git a/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor.tsx b/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor.tsx
new file mode 100644
index 0000000..5a90b6b
--- /dev/null
+++ b/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor.tsx
@@ -0,0 +1,391 @@
+"use client"
+
+import { useState } from "react"
+import { saveQuestionsAction } from "../actions"
+import { Button } from "@/components/ui/button"
+import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
+import { Input } from "@/components/ui/input"
+import { Label } from "@/components/ui/label"
+import { Textarea } from "@/components/ui/textarea"
+import type { QuestionsPayload, AssignmentQuestion } from "@/lib/questions"
+
+type QuestionEditorProps = {
+  courseId: number
+  assignmentId: number
+  initialPayload: QuestionsPayload | null
+  canEdit: boolean
+  assignmentTitle: string
+  courseTitle: string
+}
+
+const emptyQuestion = (index: number): AssignmentQuestion => ({
+  question_id: `Q${index + 1}`,
+  question_text: "",
+  question_max_total: 10,
+  is_extra_credit: false,
+})
+
+function escHtml(str: string): string {
+  return str
+    .replace(/&/g, "&amp;")
+    .replace(/</g, "&lt;")
+    .replace(/>/g, "&gt;")
+    .replace(/"/g, "&quot;")
+    .replace(/'/g, "&#039;")
+}
+
+function printQuestionsPdf(assignmentTitle: string, courseTitle: string, questions: AssignmentQuestion[]) {
+  const rows = questions
+    .map(
+      (q) =>
+        `<div class="question">
+          <div class="question-header">
+            <span class="question-id">${escHtml(q.question_id)}</span>
+            ${q.is_extra_credit ? '<span class="badge">Extra credit</span>' : ""}
+            <span class="points">${q.question_max_total} pts</span>
+          </div>
+          <p class="question-text">${escHtml(q.question_text)}</p>
+        </div>`,
+    )
+    .join("")
+
+  const count = questions.length
+  const html = [
+    "<!DOCTYPE html><html><head><meta charset='utf-8'>",
+    `<title>${escHtml(assignmentTitle)} \u2014 Questions</title>`,
+    "<style>",
+    "body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;font-size:14px}",
+    "h1{font-size:20px;margin-bottom:4px}",
+    ".meta{color:#555;font-size:13px;margin-bottom:32px}",
+    ".question{border:1px solid #ddd;border-radius:6px;padding:16px;margin-bottom:16px}",
+    ".question-header{display:flex;align-items:center;gap:8px;margin-bottom:8px}",
+    ".question-id{font-weight:bold;font-size:15px}",
+    ".points{margin-left:auto;color:#555;font-size:12px}",
+    ".badge{background:#fef3c7;color:#92400e;border-radius:99px;padding:1px 8px;font-size:11px}",
+    ".question-text{margin:0;line-height:1.6}",
+    "@media print{body{margin:20px}}",
+    "</style></head><body>",
+    `<h1>${escHtml(assignmentTitle)}</h1>`,
+    `<p class="meta">Course: ${escHtml(courseTitle)} &nbsp;&middot;&nbsp; ${count} question${count !== 1 ? "s" : ""}</p>`,
+    rows,
+    "</body></html>",
+  ].join("")
+
+  const blob = new Blob([html], { type: "text/html" })
+  const url = URL.createObjectURL(blob)
+  const win = window.open(url, "_blank")
+  if (win) {
+    win.addEventListener("load", () => {
+      win.print()
+      URL.revokeObjectURL(url)
+    })
+  }
+}
+
+export function QuestionEditor({
+  courseId,
+  assignmentId,
+  initialPayload,
+  canEdit,
+  assignmentTitle,
+  courseTitle,
+}: QuestionEditorProps) {
+  const hasSavedQuestions = Boolean(initialPayload?.questions?.length)
+
+  const [isEditing, setIsEditing] = useState(!hasSavedQuestions)
+  const [pending, setPending] = useState(false)
+  const [formError, setFormError] = useState<string | null>(null)
+  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
+
+  const [savedQuestions, setSavedQuestions] = useState<AssignmentQuestion[]>(
+    () => initialPayload?.questions ?? [],
+  )
+  const [questions, setQuestions] = useState<AssignmentQuestion[]>(() => {
+    if (!initialPayload?.questions?.length) return [emptyQuestion(0)]
+    return initialPayload.questions.map((q) => ({
+      question_id: q.question_id,
+      question_text: q.question_text,
+      question_max_total: q.question_max_total,
+      is_extra_credit: q.is_extra_credit ?? false,
+    }))
+  })
+
+  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
+    e.preventDefault()
+    setPending(true)
+    setFormError(null)
+    setFieldErrors({})
+
+    // Snapshot questions at the moment of submit — no stale closure risk
+    const snapshot = questions.map((q) => ({ ...q }))
+
+    const formData = new FormData()
+    formData.set("courseId", String(courseId))
+    formData.set("assignmentId", String(assignmentId))
+    formData.set(
+      "questionsPayload",
+      JSON.stringify({ assignment_title: "", course: "", instructions_summary: "", questions: snapshot }),
+    )
+
+    try {
+      const result = await saveQuestionsAction({}, formData)
+      if (result.errors) {
+        setFormError(result.errors._form?.[0] ?? result.errors.questionsPayload?.[0] ?? null)
+        setFieldErrors(result.errors.fieldErrors ?? {})
+        return
+      }
+      // Success — update display state immediately from the snapshot we sent
+      setSavedQuestions(result.savedQuestions ?? snapshot)
+      setIsEditing(false)
+    } catch {
+      setFormError("An unexpected error occurred. Please try again.")
+    } finally {
+      setPending(false)
+    }
+  }
+
+  const hasError = (path: string) => Boolean(fieldErrors[path]?.length)
+  const errorClass = (path: string) =>
+    hasError(path) ? "border-destructive focus-visible:ring-destructive" : undefined
+
+  const updateQuestion = (index: number, update: Partial<AssignmentQuestion>) => {
+    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...update } : q)))
+  }
+
+  const addQuestion = () => {
+    setQuestions((prev) => [...prev, emptyQuestion(prev.length)])
+  }
+
+  const removeQuestion = (index: number) => {
+    setQuestions((prev) => {
+      const next = prev.filter((_, i) => i !== index)
+      let autoNum = 1
+      return next.map((q) => {
+        if (/^Q\d+$/.test(q.question_id)) {
+          return { ...q, question_id: `Q${autoNum++}` }
+        }
+        return q
+      })
+    })
+    setFieldErrors((prev) => {
+      const next: Record<string, string[]> = {}
+      for (const key of Object.keys(prev)) {
+        const match = key.match(/^questions\.(\d+)\.(.+)$/)
+        if (!match) {
```

---
## 2) Risks / Assumptions
(Add risks or assumptions here based on PR bodies or code changes)

---
## 3) Validation / Acceptance Criteria
(Add validation steps or acceptance criteria here)
