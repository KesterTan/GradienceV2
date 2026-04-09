# Human Acceptance Tests — User Story 9

User:

---

## User Story 9.1: Restrict Instructor-Only Course Actions from Students

### Implemented behavior covered by this test
- On the course dashboard, students do not see the instructor-only **Members**, **Manage course**, or **Create assessment** buttons.
- If a student manually visits the **Manage course** page, the app shows an **Access restricted** state instead of edit/delete controls.
- If a student manually visits the **Members** page, they can view the roster but do not see the add-member form or remove-member buttons.
- If a student manually visits the **Create assignment** page, the form can render, but submitting it is blocked with the message **"You do not have permission to create assignments for this course."**

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. At least one course exists.
3. Prepare two active accounts enrolled in the same course:
   - An **Instructor** account with grader/instructor permissions in that course
   - A **Student** account with student permissions in that course
4. The course should already contain at least one assignment so the tester can also compare the instructor and student views of the assignment page.
5. Record the numeric `courseId` for the test course.

### Steps

#### Part A: Confirm the instructor can see and use instructor-only actions
1. Log in as the instructor.
2. Open the target course dashboard.
3. Confirm the page shows these controls in the upper-right action area:
   - **Members**
   - **Manage course**
   - **Create assessment**
4. Click **Create assessment**.
5. Confirm the **Create assignment** page loads and shows the assignment form.
6. Enter a mock assignment title and any required fields.
7. Click **Create assignment**.
8. Confirm the app returns to the course dashboard and the new assignment appears in the assignment list.

#### Part B: Confirm the student dashboard hides instructor-only actions
9. Log out.
10. Log back in as the student enrolled in the same course.
11. Open the same course dashboard.
12. Confirm the page does **not** show:
   - **Members**
   - **Manage course**
   - **Create assessment**
13. Open an existing assignment from the course dashboard.
14. Confirm the student does **not** see instructor-only controls such as **Edit assignment** or the **Student submissions** section.

#### Part C: Confirm direct URL access still blocks student-only misuse
15. While still logged in as the student, manually visit `/courses/<courseId>/manage`.
16. Confirm the page shows **Access restricted** and the message **"Only instructors can edit or delete this course."**
17. Manually visit `/courses/<courseId>/members`.
18. Confirm the roster page loads, but there is no add-member email form and no remove-member trash buttons.
19. Manually visit `/courses/<courseId>/assessments/new`.
20. Confirm the **Create assignment** form renders.
21. Enter a mock assignment title and any other required fields.
22. Click **Create assignment**.
23. Confirm the submission is blocked and the page shows **"You do not have permission to create assignments for this course."**
24. Confirm no new assignment appears on the course dashboard after returning to `/courses/<courseId>`.

### Metrics (and Why)

#### 1. Role-Appropriate Action Visibility

This measures whether each user role only sees the controls they can actually use.

- Lean Startup: role clarity reduces friction and shortens the path to value.
- The Mom Test: confusion shows up as hesitation, misclicks, and "why is this here?" moments, not in polite compliments.
- Why this matters for willingness to pay: if students repeatedly see instructor tools, the product feels sloppy and untrustworthy.

#### 2. Unauthorized Action Containment

This measures whether students are blocked from completing instructor-only operations even when they try direct URLs.

- Lean Startup: trust and data integrity are part of the core product value, not a bonus feature.
- The Mom Test: watching what a tester tries to bypass reveals more than asking whether they "felt secure."
- Why this matters for willingness to pay: instructors will not pay for a grading workflow they think students can tamper with.

#### 3. Recovery and Explanation Clarity

This measures whether the app explains blocked actions clearly enough that a user can recover without outside help.

- Lean Startup: clear feedback lowers support cost and keeps users moving through the product.
- The Mom Test: users expose unclear messaging when they get stuck or ask what just happened.
- Why this matters for willingness to pay: a protected action that looks like a bug still feels broken, even if the backend is correct.

### Survey Questions

**Q1. While using the course as a student, how often did the interface show actions that felt like they belonged to instructors instead of you?**

Scale: `1 = very often`, `5 = not at all`

> **Metric covered — Role-appropriate action visibility:** This question checks whether the student experience felt clean and role-specific, without dangling instructor controls that invite confusion or failed clicks.

Answer: 5 / 5

---

**Q2. After trying the direct URLs, how comfortable would you feel using this app in a real class without worrying that students could change instructor-only course settings?**

Scale: `1 = not comfortable`, `5 = very comfortable`

> **Metric covered — Unauthorized action containment:** This question gets at trust in the actual enforcement, not just the visual polish of the dashboard.

Answer: 4 / 5

---

**Q3. When the app blocked you from an instructor-only action, how quickly could you tell what happened and what to do next?**

Scale: `1 = I was confused`, `5 = I knew immediately`

> **Metric covered — Recovery and explanation clarity:** This question measures whether the app communicates blocked actions clearly enough to feel intentional rather than buggy.

Answer: 4 / 5

---

## Classmate Testing

**Classmate:**  Cici ge
**Team:** Pickmyplate
**Test date:** 2026-04-07

### Attempt 1 Responses

- **Q1:** 5 / 5
- **Q2:** 4 / 5
- **Q3:** 4 / 5

**Result:** Satisfied

### Notes

- The tester said the student dashboard was clean and did not tempt them with instructor-only buttons.
- The tester trusted the restrictions after trying direct URLs.
- The one point of hesitation was that the create-assignment page still loads for students before the permission error appears on submit, so the behavior is secure but not as explicit as an immediate redirect.

### Retest

Not needed because the tester reported the story as satisfied on the first run.

### Overall Result

- [x] Pass
- [ ] Fail

---

## Submission Tracking

- **GitHub Issue for this human acceptance test:** ________________________________
- **Kanban status updates completed:** ________________________________
- **Acceptance test PR URL:** ________________________________
- **Reviewer / teammate approval:** ________________________________
- **Merged to `main`:** ________________________________

---

## LLM Prompt Log

This local markdown file is the accessible copy of the LLM generation log for User Story 9.

### Prompt 1

> Generate a human acceptance test for this implemented behavior: students should not see instructor-only buttons on the course dashboard, students who open `/courses/<courseId>/manage` should see an access-restricted state, students who open `/courses/<courseId>/members` should not be able to add or remove members, and students who open `/courses/<courseId>/assessments/new` should be blocked on submit with "You do not have permission to create assignments for this course."

### Prompt 2

> Based on that same implemented behavior, generate three survey questions and three satisfaction metrics that measure whether role restrictions feel trustworthy, clear, and worth paying for in a real classroom workflow.

### Editing Note

The generated material was manually edited to match the application's actual behavior exactly, especially the fact that the create-assignment page can render for students but assignment creation is still blocked on submit.
