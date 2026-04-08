# Human Acceptance Tests — User Story 9

User: TBD

---

## User Story 9.1: Restrict Instructor-Only Course Actions from Students

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. At least one course exists.
3. Prepare two accounts that are both active in the same course:
   - An **Instructor** account
   - A **Student** account
4. The student must already be enrolled in the same course as the instructor.
5. Make note of the course id you are testing because you will use it for the direct URL check.

### Steps

#### Part A: Instructor experience
1. Log in as the instructor.
2. Navigate to the target course dashboard.
3. Confirm the dashboard shows a **"Create assessment"** button.
4. Confirm the dashboard also shows a **"Members"** button for roster management.
5. Click **"Create assessment"**.
6. Confirm the **Create assignment** page loads successfully.
7. Fill in a mock assignment title and any other required fields.
8. Click **"Create assignment"**.
9. Confirm the app returns you to the course dashboard.
10. Confirm the new assignment appears in the course list.

#### Part B: Student experience
11. Log out.
12. Log back in as the student enrolled in the same course.
13. Navigate to the same course dashboard.
14. Confirm the dashboard does **not** show the **"Create assessment"** button.
15. Confirm the dashboard does **not** show the **"Members"** button.
16. Confirm any instructor-only grading controls are not visible from the student view.

#### Part C: Direct access / authorization check
17. While still logged in as the student, manually visit `/courses/<courseId>/assessments/new` using the same course id from Part A.
18. Confirm the system does **not** let the student complete instructor-only assignment creation.
19. Verify one of the following happens:
   - The student is redirected away from the page, or
   - The page shows a clear unauthorized / course not found / no access message, or
   - Submitting the form is blocked with a permission error such as **"You do not have permission to create assignments for this course."**

### Metrics (and Why)

#### 1. Permission Transparency

Measures whether each role only sees actions they can actually use.

- Lean Startup: Role-appropriate UI reduces friction and helps users reach value faster.
- The Mom Test: Users reveal confusion through hesitation and misclicks, not by politely saying the interface is unclear.
- Why it matters: If students see instructor-only controls, the product feels unfinished and untrustworthy.

#### 2. Enforcement Rigor

Measures whether backend and route-level protections block privilege bypass attempts.

- Lean Startup: Security is part of the core value hypothesis for any grading workflow.
- The Mom Test: Real behavior matters more than stated trust; trying the direct URL exposes whether protection is real.
- Why it matters: If a student can access instructor workflows, the grading platform loses integrity and becomes hard to trust or adopt.

#### 3. Error Message Clarity

Measures whether a blocked student understands what happened and what to do next.

- Lean Startup: Clear recovery paths reduce support burden and keep users moving.
- The Mom Test: Good feedback is observed when users recover without asking for help.
- Why it matters: A vague failure feels like a bug; a clear explanation feels intentional and safe.

### Survey Questions

**Q1. When you were using the course page as a student, how clear did the page make your allowed actions on a scale from 1 to 5?**

> **Metric covered — Permission transparency:** This question measures whether the student-facing dashboard felt complete and role-appropriate without exposing irrelevant instructor controls. A low score means the student either saw actions they could not use or felt unsure whether something was missing from the page.

Answer: TBD

---

**Q2. After trying the direct URL, how confident were you on a scale from 1 to 5 that the system would stop students from getting into instructor-only workflows?**

> **Metric covered — Enforcement rigor:** This question measures whether the application's actual access control feels strong when a student tries to bypass the UI by navigating directly to an instructor route. A low score means the tester saw behavior that felt permissive, inconsistent, or easy to circumvent.

Answer: TBD

---

**Q3. If you reached a restricted page by mistake, how easy would it be on a scale from 1 to 5 to understand what happened and what to do next?**

> **Metric covered — Error message clarity:** This question measures whether the system's redirect or permission error gives enough context for the user to recover without confusion. A low score means the app failed in a way that felt vague, broken, or misleading.

Answer: TBD

---

## Classmate Testing

**Classmate:** TBD  
**Team:** Different team required  
**Test date:** TBD

### Attempt 1 Responses

- **Q1:** TBD
- **Q2:** TBD
- **Q3:** TBD

**Result:** TBD

### Notes / Improvements

- TBD

### Retest Responses

- **Q1:** TBD
- **Q2:** TBD
- **Q3:** TBD

**Retest Result:** TBD

### Overall Result

- [ ] Pass
- [ ] Fail

---

## Submission Tracking

- **GitHub Issue for this human acceptance test:** TBD
- **Kanban status updates completed:** TBD
- **Acceptance test PR URL:** TBD
- **Reviewer / teammate approval:** TBD
- **Merged to `main`:** TBD
- **LLM chat log or accessible URL:** TBD
