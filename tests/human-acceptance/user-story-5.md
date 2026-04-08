# Human Acceptance Test — User Story 7

## User Story: Create a New Assignment for a Course

**Story:** As an instructor, I want to create a new assignment with all relevant details so that students can clearly understand and submit the assignment for the correct course.

**Priority:** High  
**T-shirt size:** S

---

## Prerequisites

- The application is running:
  - `npm run build`
  - `npm run start`
- At least one course already exists with valid course dates.
- Two accounts are available:
  - **Instructor account** (active grader/instructor membership in the course).
  - **Student account** (active student membership in the same course).
- System state before test:
  - Start from a **logged-out** state.
  - No browser extensions/autofill behavior that modifies form inputs unexpectedly.

---

## Human Acceptance Steps (with Expected System/View State)

### Part A — Instructor can discover and open assignment creation

1. Go to the login page and sign in using the **instructor** account.
   - **Expected system/view state:** You are redirected to the dashboard/courses area with authenticated header context.

2. Open the target course dashboard (`/courses/{courseId}`) from the course list.
   - **Expected system/view state:** Course dashboard renders with course title, role badge, course date range, and action buttons.

3. Confirm the **"Create assessment"** button is visible on the course dashboard.
   - **Expected system/view state:** Button appears only for instructor role and links to `/courses/{courseId}/assessments/new`.

4. Click **"Create assessment"**.
   - **Expected system/view state:** Create page renders with header title **"Create assignment"**, subtitle as course title, and a **"New assignment"** section. Form fields are visible: `Assignment title`, `Description`, `Start date`, `End date`, `Start time`, `End time`.

---

### Part B — Required fields, validation clarity, and successful creation

5. Leave `Assignment title` empty, optionally fill other fields, then click **"Create assignment"**.
   - **Expected system/view state:** Form does not redirect. Inline error appears for title: **"Assignment title is required"**.

6. Enter a valid title (for example: `HAT US7 - Assignment A`) and optional description.
   - **Expected system/view state:** Title field now has a value; prior title validation error is gone on next successful submit attempt.

7. Enter a valid `Start date` and `End date` (end date same day or after start date). Optionally add times.
   - **Expected system/view state:** No date-order validation errors.

8. (Negative validation check) Set an invalid date order (for example, end date before start date), click **"Create assignment"**, then correct it.
   - **Expected system/view state:** Inline error appears: **"End date must be on or after start date"** (or time-order error if same-day time is invalid). After correction, error is removed on successful submit.

9. Click **"Create assignment"** with valid data.
   - **Expected system/view state:** Submit button shows **"Creating..."** briefly, then app redirects to `/courses/{courseId}`.

10. On the course dashboard, locate the new assignment in the assignment list.
    - **Expected system/view state:** Newly created assignment card is visible under the same course where it was created (course association confirmed via `course_id` behavior).

---

### Part C — Instructor-only restriction (human-visible behavior)

11. Log out and sign in using the **student** account.
    - **Expected system/view state:** Student can access course dashboard but sees student role context.

12. Open the same course dashboard.
    - **Expected system/view state:** **"Create assessment"** button is **not visible** to the student.

13. (Optional direct URL check) Manually visit `/courses/{courseId}/assessments/new`.
    - **Expected system/view state:** If the page loads, create action should still be blocked on submission for non-permitted users with a clear permission error. This validates backend role enforcement in addition to UI gating.

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Task Completion Without Guidance

**Definition:** Whether the tester can complete creation (open form -> enter required details -> submit -> verify in course list) without external help.

- **Why chosen:** Directly measures if the form is intuitive and labels are clear.
- **Lean Startup link:** Measures usability of a core workflow that drives activation and feature adoption.
- **The Mom Test link:** Focuses on observed behavior (completed or got stuck), not vague praise.
- **Lecture concept link:** UX friction and cognitive load; fewer breakdown points indicate stronger task flow design.

---

### 2) Value Metric: Perceived Workflow Efficiency

**Definition:** Tester rating of how quickly and smoothly they could create a meaningful assignment for a real class scenario.

- **Why chosen:** The story’s value is speed + clarity in preparing coursework.
- **Lean Startup link:** Captures perceived value of the feature, informing whether it solves the instructor’s real job-to-be-done.
- **The Mom Test link:** Asks about concrete experience (speed/smoothness), avoiding leading questions.
- **Lecture concept link:** Product-market fit signals begin with repeated evidence that users can complete high-value tasks with low friction.

---

### 3) Trust Metric: Confidence in Correct Placement and Access Control

**Definition:** Tester confidence that the assignment appears in the correct course and that only instructors can initiate creation from normal UI.

- **Why chosen:** Academic workflows require confidence in data correctness and permission boundaries.
- **Lean Startup link:** Trust supports retention; low trust increases verification overhead and abandonment risk.
- **The Mom Test link:** Reveals real trust through confidence in outcomes, not "Do you like the feature?" wording.
- **Lecture concept link:** System credibility and role-based integrity are essential for reliable educational tooling.

---

## 3-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how smooth was the full process of creating an assignment (from course page to seeing it listed)?
2. On a scale of **1-5**, how clear were the field labels and validation messages when entering assignment details?
3. On a scale of **1-5**, how confident are you that the assignment was created in the correct course and that creation is restricted to instructors in normal use?

---

## Real Tester Execution Record (Required)

**Tester name (from another team):**  
`Evelyn Liu`

**Test date:**  
`April 7th, 2026`

### Survey Responses

- **Q1 (Smoothness 1-5):** `5`
- **Q2 (Field/validation clarity 1-5):** `5`
- **Q3 (Trust in correctness/access control 1-5):** `4`

### Observations During Test

- Where the tester hesitated:
  - `When the dates errored`
- Any confusion or misclicks:
  - `Occasionally finding the desired button for the next task: due to it being smaller on hte screen`
- Notable quotes/reactions:
  - `NA`

### Result

- [X] Pass
- [ ] Fail

---
