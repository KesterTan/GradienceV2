# User Story 2.1: Create Course

## Source

Human Acceptance Testing scenario for instructor course creation flow.

## Prerequisites

- Application is running.
- User is logged in as instructor.
- User has access to dashboard.

## Steps

1. Navigate to dashboard.
2. Click “Create Course”.
3. Enter:
   - Course name
   - Start date
   - End date
4. Submit form.
5. Confirm success message.
6. Return to dashboard.

### Validation

1. Attempt to create a course with missing name.
2. Confirm validation error appears.
3. Attempt to create a course with invalid dates.
4. Confirm validation error appears.

## Metrics (and Why)

### 1. Course Creation Completion Rate

% of users who successfully create a course without help.

- Lean Startup: Activation metric
- Why: Core onboarding funnel — if this fails, product is dead

### 2. Input Validation Clarity

How clearly form errors guide users to fix invalid entries.

- Mom Test: Observes if users can recover without asking for help
- Why: Good validation prevents frustration and failed setup

### 3. Instructor Readiness Confidence (Post-Creation)

Whether users feel ready to set up a real class after creating one course.

- Lean Startup: Proxy for willingness to adopt
- Why: This is where curiosity → commitment begins

## Survey Questions

1. When setting up your course, how much did you feel like you were guessing what to do versus just moving forward confidently? (1–5)

> **Metric covered — Course creation completion confidence:** This question measures whether the course setup flow is intuitive enough for an instructor to complete without confusion or external help. A score of 1 indicates repeated uncertainty and trial-and-error; a score of 5 indicates clear, confident progress from start to successful creation.

Answer: **5 / 5** — The create-course form was straightforward, and I completed setup in one pass without guessing.

2. When you made an invalid entry (such as missing name or bad dates), how clearly did the system tell you what to fix? (1–5)

> **Metric covered — Input validation clarity:** This question measures whether validation feedback is specific and actionable. A score of 1 indicates vague errors that left the user uncertain; a score of 5 indicates immediate, clear guidance on what field to correct.

Answer: **4 / 5** — Validation appeared correctly and prevented submission, but the date guidance could be a bit more explicit.

3. If you had to set up a real class tomorrow, how ready would you feel after this creation flow? (1–5)

> **Metric covered — Instructor readiness confidence:** This question measures whether instructors feel the system is dependable enough for real classroom setup after first use. A score of 1 indicates low confidence; a score of 5 indicates strong confidence to adopt immediately.

Answer: **4 / 5** — I’d use it, but a slightly richer success summary would improve confidence.

## Classmate Testing

**Classmate:** Christine Truong

### Attempt 1 Responses

- **Q1:** 5 — I could create the course without needing help.
- **Q2:** 4 — Validation worked, though date error text could be clearer.
- **Q3:** 4 — I’m mostly confident, but I want stronger confirmation details before final use.

**Result:** Pass

### Notes / Improvements

- Add a brief success toast with key course details after creation.
- Show date validation guidance inline before submission (e.g., end date must be after start date).

---

# User Story 2.2: View Course

## Source

Human Acceptance Testing scenario for instructor course discovery and navigation flow.

## Prerequisites

- Application is running.
- User is logged in as instructor.
- At least one course exists.
- User has access to dashboard.

## Steps

1. Navigate to dashboard.
2. Confirm course appears in list.
3. Verify role is shown as instructor.
4. Click course.
5. Confirm navigation to course page.

## Metrics (and Why)

### 1. Dashboard Discoverability

How easily users find and navigate courses.

- Mom Test: Observes behavior (“did they hesitate?”)
- Why: Dashboard = main entry point → affects daily usage

### 2. Navigation Predictability

Whether clicking a course reliably opens the expected destination.

- Lean Startup: Usability quality indicator
- Why: Broken or unclear navigation blocks daily workflow

### 3. Instructor Orientation Confidence

Whether users feel oriented and in control when returning to existing courses.

- Lean Startup: Retention-adjacent confidence signal
- Why: Fast re-entry into course space supports recurring usage

## Survey Questions

1. When you returned to the dashboard, how easy was it to find your course again? (1–5)

> **Metric covered — Dashboard discoverability:** This question measures how quickly and confidently instructors can locate their course from the dashboard. A score of 1 indicates confusion or hesitation; a score of 5 indicates instant recognition and low effort.

Answer: **5 / 5** — The course card was easy to spot and visually clear.

2. After clicking the course, how predictable did the navigation feel? (1–5)

> **Metric covered — Navigation predictability:** This question measures whether users trust that actions lead to expected destinations. A score of 1 indicates uncertainty or wrong/slow destinations; a score of 5 indicates direct, expected navigation behavior.

Answer: **5 / 5** — Clicking the course consistently opened the correct course page.

3. If you needed to jump between multiple courses during a real teaching day, how confident are you this view flow would support that? (1–5)

> **Metric covered — Instructor orientation confidence:** This question measures perceived readiness for repeated daily navigation. A score of 1 indicates disorientation and low trust; a score of 5 indicates high confidence for routine use.

Answer: **4 / 5** — Flow is strong, but sorting/filter options would help once there are many courses.

## Classmate Testing

**Classmate:** Christine Truong

### Attempt 1 Responses

- **Q1:** 5 — Course was immediately visible on dashboard.
- **Q2:** 5 — Navigation to course page was direct and correct.
- **Q3:** 4 — Good overall, but list controls would help at scale.

**Result:** Pass

### Notes / Improvements

- Consider sorting newly updated courses to top.
- Add optional search/filter for larger course lists.
