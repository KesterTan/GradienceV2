# Human Acceptance Test — User Story 11

## User Story: View My Grades (Student)

**As a student, I want to view my grades (including total score and rubric breakdown) so that I understand my performance in the course.**

**Priority:** High  
**T-shirt size:** M

---

## Prerequisites

- The application is running:
  - `npm run build`
  - `npm run start`
- A **Student** account exists and is logged in.
- The student is enrolled in at least one course with at least one graded assignment.
- The assignment has rubric-based grading data in the system.
- System state before test:
  - Start from a **logged-out** state.
  - No browser extensions/autofill behavior that modifies form inputs unexpectedly.

---

## Human Acceptance Steps (with Expected System/View State)

1. Log in as the **student** account.
   - **Expected system/view state:** Redirected to dashboard/courses area with authenticated header context.
2. Open the target course and select an assignment from the list.
   - **Expected system/view state:** Assignment details or submission page loads, showing the student's submission and grading panel.
3. Confirm the **total score** is clearly visible near the top of the grading panel (e.g., as a badge or summary bar).
   - **Expected system/view state:** Total score is prominent and easy to find (e.g., bold font, badge, or summary section).
4. Review the **rubric breakdown** for the assignment.
   - **Expected system/view state:** Each rubric criterion and its score are listed in a well-organized, readable format (e.g., collapsible sections, table, or card layout), with feedback and confidence indicators if present.
5. Ask the instructor to update a grade for one rubric criterion, then refresh the page.
   - **Expected system/view state:** The updated score is reflected immediately and is easy to notice (e.g., score changes, possibly with a subtle highlight or animation).

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Score Visibility

**Definition:** Whether the tester can easily find the total score without searching.
- **Why chosen:** Ensures students can quickly understand their overall performance.
- **Lean Startup link:** Measures discoverability and friction in a core workflow.
- **The Mom Test link:** Evaluates observable behavior (finds score quickly or gets stuck), not just opinion.
- **Lecture concept link:** UX clarity and feedback.

### 2) Value Metric: Rubric Breakdown Clarity

**Definition:** Tester rating of how easy it is to understand the rubric breakdown and individual criterion scores.
- **Why chosen:** Detailed feedback helps students learn and improve.
- **Lean Startup link:** Captures perceived value of actionable, transparent feedback.
- **The Mom Test link:** Asks about actual experience during a concrete task, not hypothetical preference.
- **Lecture concept link:** Product-market fit signals and trust.

### 3) Trust Metric: Grade Update Noticeability

**Definition:** Tester confidence that grade updates are reflected promptly.
- **Why chosen:** Students need to trust that grades are current and changes are visible.
- **Lean Startup link:** Trust supports retention and reduces confusion.
- **The Mom Test link:** Confidence after real interaction reveals trust more reliably than leading questions.
- **Lecture concept link:** System credibility and transparency.

---

## 4-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how easy was it to find your total score?
2. On a scale of **1-5**, how clear and understandable was the rubric breakdown?
3. On a scale of **1-5**, how readable and well-organized was the grading information?
4. On a scale of **1-5**, how prompt were updates to your grades?

---

## Real Tester Execution Record (Required)


**Tester name (from another team):**  
`Gabriel`

**Test date:**  
`April 8th, 2026`

### Survey Responses

- **Q1 (Score visibility 1-5):** `5`
- **Q2 (Rubric clarity 1-5):** `4`
- **Q3 (Readability 1-5):** `5`
- **Q4 (Update promptness 1-5):** `4`

### Observations During Test

- Where the tester hesitated:
   - `[Looking at the breakdown for each question was confusing (Subtext under the question)]`
- Any confusion or misclicks:
   - `[n/a]`
- Notable comments:
   - `[Asked about how to do regrade requests. Grade updates could have some indicator but not nessecary.]`

### Result

- [x] Pass
- [ ] Fail

---
