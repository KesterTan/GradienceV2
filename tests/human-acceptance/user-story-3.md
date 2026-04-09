# Human Acceptance Tests — User Story 3

## User Story 3.1: View Course Members

### Prerequisites
- The application is running:
  ```
  npm run build
  npm run start
  ```
- An **Instructor** account exists and is logged in.
- A **Student** account exists and is logged in.
- A course exists with both instructor(s) and student(s) enrolled.

### Steps

# User Story 3.1: View Course Members

**As an instructor or student, I want to view the list of course members (students and instructors) so that I understand who is part of the course.**

**Priority:** High  
**T-shirt size:** S

---

## Prerequisites

- The application is running:
  - `npm run build`
  - `npm run start`
- At least one course already exists with valid course dates.
- Two accounts are available:
  - **Instructor account** (active instructor/creator membership in the course).
  - **Student account** (active student membership in the same course).
- System state before test:
  - Start from a **logged-out** state.
  - No browser extensions/autofill behavior that modifies form inputs unexpectedly.

---

## Human Acceptance Steps (with Expected System/View State)

1. Log in as either the **instructor** or **student** account.
   - **Expected system/view state:** You are redirected to the dashboard/courses area with authenticated header context.
2. Open the target course dashboard (`/courses/{courseId}`) from the course list.
   - **Expected system/view state:** Course dashboard renders with course title, role badge, and navigation tabs.
3. Click the **"Members"** tab or button to open the members page (`/courses/{courseId}/members`).
   - **Expected system/view state:** The page displays two lists: **Instructors** and **Students**, each with clear headers and member names. If a list is empty, a message like **"No students yet"** or **"No instructors yet"** is shown.
4. Confirm you can clearly distinguish between students and instructors.
   - **Expected system/view state:** Grouping, headers, and icons make roles obvious. Your own entry is labeled (e.g., **"You"** badge).

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Role Clarity

**Definition:** Whether the tester can clearly distinguish between students and instructors.
- **Why chosen:** Ensures the UI is clear and intuitive for all roles.
- **Lean Startup link:** Measures discoverability and friction in a core workflow.
- **The Mom Test link:** Evaluates observable behavior (finds the right group quickly or gets stuck), not just opinion.
- **Lecture concept link:** UX clarity and permission boundaries.

### 2) Value Metric: Page Layout & Speed

**Definition:** Tester rating of how easy it is to scan the lists and how quickly the page loads.
- **Why chosen:** Fast, scannable lists are critical for trust and smooth operation.
- **Lean Startup link:** Captures perceived value of responsive, modern UI.
- **The Mom Test link:** Asks about actual experience during a concrete task, not hypothetical preference.
- **Lecture concept link:** Product-market fit signals and trust.

### 3) Trust Metric: Empty State Clarity

**Definition:** Tester confidence that empty states are understandable and accurate.
- **Why chosen:** Users need to trust the roster is accurate, even when empty.
- **Lean Startup link:** Trust supports retention and reduces verification overhead.
- **The Mom Test link:** Confidence after real interaction reveals trust more reliably than leading questions.
- **Lecture concept link:** System credibility and role-based integrity.

---

## 4-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how clear was the distinction between students and instructors?
2. On a scale of **1-5**, how easy was it to scan and understand the member lists?
3. On a scale of **1-5**, how quickly did the page load (speed/performance)?
4. On a scale of **1-5**, how clear and understandable was the empty state message if there were no students or instructors?

---

## Real Tester Execution Record (Required)

**Tester name (from another team):**  
`Gabriel`

**Test date:**  
`April 8th, 2026`

### Survey Responses

- **Q1 (Role clarity 1-5):** `5`
- **Q2 (Layout/speed 1-5):** `4`
- **Q3 (Page load quick? 1-5):** `5`
- **Q4 (Empty state clear? 1-5):** `5`


### Observations During Test

- Where the tester hesitated:
   - `[When checking which tab was students vs instructors]`
- Any confusion or misclicks:
   - `[Clicked wrong tab, realized and switched back]`
- Notable comments:
   - `["You" badge is nice]`

### Result

- [x] Pass
- [ ] Fail

---

# Human Acceptance Test — User Story 3.2

## User Story: Add Course Members

**Story:** As an instructor, I want to add students or instructors by email so that I can grant them access to the course.

**Priority:** High  
**T-shirt size:** M

---

## Prerequisites

- The application is running.
- An **Instructor** account exists and is logged in.
- A course exists where the instructor has permission to add members.
- System state before test:
  - Start from a **logged-out** state.
  - No browser extensions/autofill behavior that modifies form inputs unexpectedly.

---

## Human Acceptance Steps (with Expected System/View State)

1. Log in as the **instructor** account and open the course members page.
   - **Expected system/view state:** An **Add member** input is visible above the member lists, with a field for email and an **Add** button. Only instructors see this.
2. Enter a valid email and click **Add** (choose role by switching tabs if needed).
   - **Expected system/view state:** The new member appears immediately in the correct list ("Instructors" or "Students"). A success toast/notification appears. If the email is already present, an error is shown and the member is not added.
3. Try adding the same email again.
   - **Expected system/view state:** An error is shown and the member is not added.
4. Log in as a **student** and confirm the add member input is not visible.
   - **Expected system/view state:** Students cannot add members; the input is hidden.

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Input & Role Selection

**Definition:** Whether the tester can easily find and use the email input and role selection.
- **Why chosen:** Ensures the add-member controls are visible and intuitive.
- **Lean Startup link:** Measures discoverability and friction in a core workflow.
- **The Mom Test link:** Evaluates observable behavior (finds input quickly or gets stuck), not just opinion.
- **Lecture concept link:** UX clarity and permission boundaries.

### 2) Value Metric: Feedback & UI Reactivity

**Definition:** Tester rating of how clear the feedback is after adding (success/error) and how quickly the UI updates.
- **Why chosen:** Real-time feedback is critical for trust and smooth operation.
- **Lean Startup link:** Captures perceived value of responsive, modern UI.
- **The Mom Test link:** Asks about actual experience during a concrete task, not hypothetical preference.
- **Lecture concept link:** Product-market fit signals and trust.

### 3) Trust Metric: Permission Enforcement

**Definition:** Tester confidence that only instructors can add and that duplicates are prevented.
- **Why chosen:** Academic workflows require confidence in access control and roster accuracy.
- **Lean Startup link:** Trust supports retention and reduces verification overhead.
- **The Mom Test link:** Confidence after real interaction reveals trust more reliably than leading questions.
- **Lecture concept link:** System credibility and role-based integrity.

---

## 4-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how easy was it to find and use the email input and role selection?
2. On a scale of **1-5**, how clear was the feedback after adding a member (success or error)?
3. On a scale of **1-5**, how quickly did the member list update after adding?
4. On a scale of **1-5**, how well did the system prevent non-instructors or duplicates from being added?

---

## Real Tester Execution Record (Required)

**Tester name (from another team):**  
`Gabriel`

**Test date:**  
`April 8th, 2026`

### Survey Responses

- **Q1 (Input/role selection 1-5):** `4`
- **Q2 (Feedback clear? 1-5):** `5`
- **Q3 (UI updated? 1-5):** `5`
- **Q4 (Permission enforced? 1-5):** `5`


### Observations During Test

- Where the tester hesitated:
   - `[When switching tabs to add instructor]`
- Any confusion or misclicks:
   - `[Typo in email, error showed, fixed]`
- Notable comments:
   - `[n/a]`

### Result

- [x] Pass
- [ ] Fail

---

# Human Acceptance Test — User Story 3.3

## User Story: Remove Course Members

**Story:** As an instructor, I want to remove students or instructors from a course so that I can maintain control and security of course membership.

**Priority:** High  
**T-shirt size:** S

---

## Prerequisites

- The application is running.
- An **Instructor** account exists and is logged in.
- A course exists with at least one student and one instructor enrolled.
- System state before test:
  - Start from a **logged-out** state.
  - No browser extensions/autofill behavior that modifies form inputs unexpectedly.

---

## Human Acceptance Steps (with Expected System/View State)

1. Log in as the **instructor** and open the course members page.
   - **Expected system/view state:** Each member (except yourself) has a **Remove** button (trash icon). Only instructors see these controls.
2. Click **Remove** on a member and confirm in the dialog.
   - **Expected system/view state:** A confirmation dialog appears. After confirming, the member disappears from the list and a success message appears. If there is an error, it is shown in the dialog.
3. Log in as a **student** and confirm remove controls are not visible or are disabled.
   - **Expected system/view state:** Students cannot remove members; the controls are hidden or disabled.

---

## Satisfaction Metrics (3) and Why They Matter

### 1) Usability Metric: Remove Control Visibility

**Definition:** Whether the tester can easily find and understand the remove action (and that it is only visible to instructors).
- **Why chosen:** Ensures only instructors see and can use remove controls.
- **Lean Startup link:** Measures discoverability and friction in a core workflow.
- **The Mom Test link:** Evaluates observable behavior (finds remove quickly or gets stuck), not just opinion.
- **Lecture concept link:** UX clarity and permission boundaries.

### 2) Value Metric: Feedback & UI Reactivity

**Definition:** Tester rating of how clear the feedback is after removal and how quickly the UI updates.
- **Why chosen:** Real-time feedback is critical for trust and smooth operation.
- **Lean Startup link:** Captures perceived value of responsive, modern UI.
- **The Mom Test link:** Asks about actual experience during a concrete task, not hypothetical preference.
- **Lecture concept link:** Product-market fit signals and trust.

### 3) Trust Metric: Permission Enforcement & Safety

**Definition:** Tester confidence that only instructors can remove, and that the action feels safe (confirmation prompt, error handling).
- **Why chosen:** Academic workflows require confidence in access control and roster accuracy.
- **Lean Startup link:** Trust supports retention and reduces verification overhead.
- **The Mom Test link:** Confidence after real interaction reveals trust more reliably than leading questions.
- **Lecture concept link:** System credibility and role-based integrity.

---

## 5-Question Survey (Neutral, Experience-Focused)

1. On a scale of **1-5**, how visible and clear were the remove buttons for instructors?
2. On a scale of **1-5**, how clear was the feedback after removing a member?
3. On a scale of **1-5**, how quickly did the member list update after removal?
4. On a scale of **1-5**, how well did the system prevent non-instructors from removing members?
5. On a scale of **1-5**, how safe did the removal action feel (confirmation prompt, error handling)?

---

## Real Tester Execution Record (Required)

**Tester name (from another team):**  
`Gabriel`

**Test date:**  
`April 8th, 2026`

### Survey Responses

- **Q1 (Remove visible 1-5):** `5`
- **Q2 (Feedback clear? 1-5):** `5`
- **Q3 (UI updated? 1-5):** `5`
- **Q4 (Permission enforced? 1-5):** `5`
- **Q5 (Action safe? 1-5):** `5`


### Observations During Test

- Where the tester hesitated:
   - `[Double-checked before clicking remove]`
- Any confusion or misclicks:
   - `[Almost clicked remove on myself but then saw that the button was disabled]`
- Notable comments:
   - `[Confirmation dialog felt safe]`

### Result

- [x] Pass
- [ ] Fail

