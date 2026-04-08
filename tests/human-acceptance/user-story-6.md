# Human Acceptance Test — User Story 6

## User Story: Edit Assignment Details

**Story:** As an instructor, I want to edit the details of assignments I’ve created so that I can fix mistakes or adjust deadlines when needed.

**Priority:** Medium  
**T-shirt size:** S  
**Classification:** P2 user story, already implemented

---

## Prerequisites

- The application is running:
  - `npm run build`
  - `npm run start`
- At least one course exists with valid course date range.
- At least one assignment already exists in that course.
- Two accounts are available:
  - **Instructor account** with active grader/instructor membership in the course.
  - **Student account** with active student membership in the same course.
- System state before test:
  - Start from a **logged-out** state.

---

## Human Acceptance Steps (with Expected System/View State)

### Part A — Instructor can locate and open edit flow

1. Go to the login page and sign in with the **instructor** account.
   - **Expected system/view state:** You are redirected to the authenticated dashboard/courses area.

2. Open the target course dashboard (`/courses/{courseId}`).
   - **Expected system/view state:** Course dashboard displays assignment cards for this course.

3. Open an existing assignment from the list.
   - **Expected system/view state:** Assignment detail page loads with title, description (if present), and due date.

4. Confirm the **"Edit assignment"** button is visible in the top action area.
   - **Expected system/view state:** Edit button is present for instructors and links to `/courses/{courseId}/assessments/{assignmentId}/edit`.

5. Click **"Edit assignment"**.
   - **Expected system/view state:** Edit page loads with header **"Edit assignment"** and pre-filled form fields (`Assignment title`, `Description`, `Start date`, `End date`, `Start time`, `End time`) matching current assignment data.

---

### Part B — Validate editing behavior and persistence

6. Change title and/or description (example title: `HAT US6 - Edited Assignment Title`).
   - **Expected system/view state:** Form inputs show edited values before save.

7. (Validation check) Clear `Assignment title`, click **"Save changes"**, then re-enter a valid title.
   - **Expected system/view state:** Form does not redirect, and inline error appears: **"Assignment title is required"**. After entering a valid title, error is resolved on successful submit.

8. Update date fields to valid values (end date/time on or after start date/time and within course range).
   - **Expected system/view state:** No date-order/range error messages appear.

9. (Negative check) Set an invalid date order (for example end date before start date), click **"Save changes"**, then correct it.
   - **Expected system/view state:** Inline date validation appears (for example **"End date must be on or after start date"**), and save is blocked until corrected.

10. Click **"Save changes"** with valid edited values.
    - **Expected system/view state:** Save button changes to **"Saving..."** briefly, then app redirects to assignment detail page (`/courses/{courseId}/assessments/{assignmentId}`).

11. On assignment detail page, verify updated fields are shown.
    - **Expected system/view state:** Updated title/description/due-date information is visible immediately after redirect.

12. Refresh the page.
    - **Expected system/view state:** Updated details remain unchanged after reload, confirming persistence in database-backed state.

---

### Part C — Restrict editing to authorized roles

13. Log out and sign in with the **student** account.
    - **Expected system/view state:** Student can view assignment detail page content but has student-level UI.

14. Open the same assignment detail page.
    - **Expected system/view state:** **"Edit assignment"** button is not visible for student role.

15. (Optional direct URL check) Manually navigate to `/courses/{courseId}/assessments/{assignmentId}/edit`.
    - **Expected system/view state:** Unauthorized users should not be able to complete edits successfully; system denies access (not found/blocked path behavior), confirming role restriction.

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Edit Flow Findability and Completion

**Definition:** Whether the tester can find the edit entry point and complete a valid update without external help.

- **Why chosen:** Human acceptance criteria require users to easily locate and edit details.
- **Lean Startup link:** Measures friction in a core maintenance workflow used repeatedly by instructors.
- **The Mom Test link:** Evaluates observable behavior (finds edit quickly or gets stuck), not opinion-only praise.
- **Lecture concept link:** Discoverability and low cognitive load are key usability signals.

---

### 2) Value Metric: Perceived Efficiency of Correcting Assignment Mistakes

**Definition:** Tester rating of how quickly and smoothly they can fix assignment data (title/description/deadline) when needed.

- **Why chosen:** The feature’s value is operational speed when correcting real coursework mistakes.
- **Lean Startup link:** Indicates if the feature delivers practical value in instructor workflows.
- **The Mom Test link:** Asks about actual experience during a concrete task, not hypothetical preference.
- **Lecture concept link:** User-perceived utility is an early indicator of sustained product usage.

---

### 3) Trust Metric: Confidence in Saved Updates and Role Safety

**Definition:** Tester confidence that edits are saved correctly and only authorized roles can perform edits.

- **Why chosen:** This story depends on both data integrity (persisted updates) and authorization integrity.
- **Lean Startup link:** Trust drives retention and lowers re-check/verification overhead.
- **The Mom Test link:** Confidence after real interaction reveals trust more reliably than leading security questions.
- **Lecture concept link:** Reliable system behavior and role boundaries are critical for high-stakes academic workflows.

---

## 3-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how easy was it to find and use the assignment edit flow from the assignment page?
2. On a scale of **1-5**, how clear were the form fields and validation messages while editing assignment details?
3. On a scale of **1-5**, how confident are you that your changes were saved correctly and protected from unauthorized edits?

---

## Real Tester Execution Record (Required)

**Tester name (from another team):**  
`[Evelyn Liu]`

**Test date:**  
`[April 7th, 2026]`

### Survey Responses

- **Q1 (Findability/ease 1-5):** `[4]`
- **Q2 (Field/validation clarity 1-5):** `[5]`
- **Q3 (Trust in persistence/authorization 1-5):** `[4]`

### Observations During Test

- Where the tester hesitated:
  - `[When they got an error message about invalid dates and when looking for the edit button]`
- Any confusion or misclicks:
  - `[When they filled in the wrong date for when the assignment ends]`
- Notable comments:
  - `[Maybe update the edit button's UI to make it more visible]`

### Result

- [X] Pass
- [ ] Fail

---
