# User Story 13: Data Persistence

## Source

Human Acceptance Testing scenario for persistence and consistency of saved academic data.

## Prerequisites

- User is logged in.
- User can create/edit data (e.g., rubric, assignment).
- Optional: second user for shared testing.
- Optional: system restart capability.

## Steps

1. Create or edit data (e.g., rubric item).
2. Save changes.
3. Refresh page and confirm persistence.
4. Log out and log back in.
5. Confirm data still exists.
6. (Optional) Second user modifies data.
7. Refresh and confirm update appears.
8. (Optional) Restart system and confirm persistence.

## Metrics (and Why)

### 1. Persistence Success Rate

% of cases where data survives refresh + re-login.

- Lean Startup: Reliability metric
- Why: Data loss = immediate churn

### 2. Consistency Across Users

Whether updates propagate correctly.

- Why: Collaboration is core to grading workflows

### 3. Trust in Storing Academic Data

Willingness to store real grades/rubrics.

- Mom Test: Users won’t say “I trust it,” but behavior shows it
- Why: This directly determines willingness to pay

## Survey Questions

1. After saving your work, how often did you feel the need to double-check that it actually saved? (1–5)

> **Metric covered — Persistence success confidence:** This question measures whether users trust that saved changes persist without needing repeated manual verification. A score of 1 indicates low confidence and repeated checking behavior; a score of 5 indicates strong confidence that saves are durable across refresh and re-login.

Answer: **4 / 5** — Save behavior was reliable, but I still did one manual refresh to confirm out of habit.

2. When changes were made (by you or others), how predictable did the system feel in showing the latest version? (1–5)

> **Metric covered — Consistency across users:** This question measures whether shared data reflects the latest updates accurately and predictably. A score of 1 indicates stale or conflicting views; a score of 5 indicates updates appear consistently and users trust the displayed state.

Answer: **4 / 5** — Updates appeared after refresh and remained consistent, though near-real-time update cues could be clearer.

3. If this system stored real grades, how comfortable would you feel not keeping a backup elsewhere? (1–5)

> **Metric covered — Trust in storing academic data:** This question measures confidence in relying on the platform as a primary record for sensitive grading data. A score of 1 indicates low trust and high backup dependence; a score of 5 indicates strong confidence in platform reliability and integrity.

Answer: **4 / 5** — I’d be comfortable using it for real grades, but export/history visibility would increase confidence further.

## Classmate Testing

**Classmate:** Evelyn Lui

### Attempt 1 Responses

- **Q1:** 4 — I still checked once after saving, but data persisted across refresh and re-login.
- **Q2:** 4 — Shared updates were consistent after refresh.
- **Q3:** 4 — I trust it for coursework, but I’d still want periodic exports.

**Result:** Pass

### Notes / Improvements

- Add stronger “Saved successfully” feedback with timestamp.
- Consider auto-refresh or live update indicator for collaborative edits.
- Add export/version-history options to strengthen trust for high-stakes grading data.
