# Development Specification — Regrade Requests

## Scope / user story
**User story in scope:** *As a student, I want to request a regrade for my assignment and provide a reason, so that I can have my work reviewed again if I believe it was graded incorrectly.*

This story adds a structured regrade workflow to the existing grading experience. Students can submit one pending regrade request for a released grade, instructors can see pending requests surfaced in the submissions list, and instructors can resolve a request by updating rubric scores and feedback.

## Architecture
- **Student flow**
  - Student opens the released grade page for a submission.
  - The page renders `RegradeRequestCard` when a released grade exists.
  - The card calls `POST /api/courses/:courseId/assessments/:assignmentId/submissions/:submissionId/regrade`.
- **Instructor flow**
  - Instructor opens the assessment page.
  - Submission groups with pending regrade requests are pinned to the top.
  - Instructor resolves the request through the grading form and resolution action path.
- **Data flow**
  - `regrade_requests` stores the student reason, status, and resolution metadata.
  - `grades` and `rubric_scores` remain the source of truth for the final resolved score.

## Information flow
1. Student authenticates via `requireAppUser()`.
2. The regrade route verifies the student has an active student membership in the course.
3. The route verifies the submission belongs to that student and the grade has been released.
4. The route checks for an existing pending regrade request.
5. A new `regrade_requests` row is created with status `pending`.
6. Instructor views the assessment page, where submissions with pending regrades are surfaced first.
7. Instructor resolves the regrade by updating scores and feedback.
8. Resolution updates the grade, rubric scores, and the `regrade_requests` row to `resolved`.
9. Revalidation refreshes both instructor and student pages so the new status and score are visible.

## Backend changes
- `db/schema.ts` and `db/schema.sql`
  - Add `regrade_requests` table with `pending` and `resolved` lifecycle fields.
- `lib/course-management.ts`
  - Add helper functions for creating requests, looking up existing requests, listing requests for an assessment, and resolving requests.
- `app/api/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/regrade/route.ts`
  - `POST` handles student request creation.
  - `PATCH` handles instructor resolution.
- `app/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/actions.ts`
  - When a `regradeRequestId` is present, the grading save action marks that request resolved after the grade update succeeds.

## Frontend changes
- `app/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/grade/_components/regrade-request-card.tsx`
  - Student-facing card for entering a reason and seeing pending/resolved state.
- `app/courses/[courseId]/assessments/[assignmentId]/page.tsx`
  - Instructor assessment page now pins students with pending regrade requests to the top of the submissions list.
- Instructor resolution reuses the existing submission grading UI rather than introducing a parallel grading system.

## Test changes
- `tests/assessments/regrade-route.test.ts`
  - Covers POST failures for missing reason, wrong role, missing submission, unreleased grade, duplicate pending request, and success.
  - Covers PATCH failures for wrong role, missing request, already resolved request, and success.
- CI coverage
  - These tests run in `.github/workflows/test.yml` under the Vitest job on `push` and `pull_request`.

## Risks / assumptions
- Only one pending regrade request per submission is enforced at the application layer.
- Regrade requests require the grade to be released first.
- The current model overwrites the existing grade rather than preserving an immutable audit trail of the original score.
- The instructor resolution path depends on the existing grading workflow remaining compatible with regrade resolution needs.

## Human Review Checklist
- Confirm students cannot submit regrade requests for unreleased grades.
- Confirm students cannot create duplicate pending requests for the same submission.
- Confirm instructor-only resolution is enforced in both UI and route behavior.
- Confirm resolved regrades visibly change the student grade page and clear the pending queue state for instructors.
