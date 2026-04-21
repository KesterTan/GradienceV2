Use the current regrade-request story JSON and the relevant repository files to generate or complete implementation work for the regrade-request feature.

Required behavior:
- Keep changes scoped to a single user story.
- Follow existing Next.js App Router, Drizzle, and testing patterns already used in this repository.
- Prefer incremental changes that can land in one PR.
- Call out any uncertainty instead of inventing behavior.

Implementation goals for this story:
- Student submits a non-empty regrade reason for a released grade.
- Only one pending request is allowed per submission.
- Instructor sees pending regrade submissions surfaced in the assessment list.
- Instructor resolves the request by updating rubric scores and feedback.
- Student sees the updated score and resolved status after refresh.

Output format:
1. Short implementation plan
2. Files to change
3. Proposed code changes
4. Tests to add or update
5. Risks / human checks
