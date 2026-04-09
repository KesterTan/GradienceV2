# Human Acceptance Tests — User Story 10

User:

---

## User Story 10.1: Automatically Recalculate Grade Totals While Instructors Score a Rubric

### Implemented behavior covered by this test
- Instructors can open a student's submission grading page when the assessment already has a saved rubric.
- The grading form shows numeric inputs for each rubric item, a per-question subtotal, and an overall **Total score** summary.
- As the instructor changes rubric item scores, the question subtotal and overall total update automatically.
- There is no separate **Calculate** or **Refresh** button required to see the new total.

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. An **Instructor** account exists and can access a course as a grader/instructor.
3. A course exists with:
   - At least one assessment
   - A saved rubric for that assessment with at least 2 rubric items
   - At least one student submission available to grade
4. Record the `courseId`, `assignmentId`, and `submissionId` for the submission you will test.

### Steps

#### Part A: Open the grading form
1. Log in as the instructor.
2. Open the course dashboard for the target course.
3. Open the assessment that contains the student submission.
4. In the **Student submissions** section, open one student's submission.
5. Confirm the right-side grading card is labeled **Grade submission**.
6. Confirm the grading card shows:
   - A **Total score** summary near the top
   - At least two rubric score inputs
   - A **Save grades** or **Update grades** button

#### Part B: Verify automatic total updates
7. Note the current **Total score** value shown near the top of the grading card.
8. In the first rubric item score input, enter a whole number such as `4`.
9. Confirm the subtotal for that rubric question updates immediately.
10. Confirm the overall **Total score** updates immediately without clicking any separate calculate control.
11. In a second rubric item score input, enter another whole number such as `3`.
12. Confirm the question subtotal updates again if that second item belongs to the same question.
13. Confirm the overall **Total score** now equals the visible sum of the rubric item scores you entered.
14. Change one of the rubric item scores to a different valid number, such as `4` to `5`.
15. Confirm the overall **Total score** changes immediately again and matches the new correct sum.

#### Part C: Confirm the grading flow still feels usable
16. Do not use any browser refresh or page reload during the total-update checks.
17. Confirm you never needed to click a **Calculate**, **Refresh**, or similar button to get the new total.
18. Optionally click **Save grades** after verifying the live calculation behavior if you want to preserve the scores you entered.

### Metrics (and Why)

#### 1. Calculation Responsiveness

This measures how quickly the subtotal and total respond after a rubric score changes.

- Lean Startup: fast feedback reduces wasted time in a repeated grading workflow.
- The Mom Test: if a grader pauses to wonder whether the math updated, that hesitation reveals friction better than a polite compliment would.
- Why this matters for willingness to pay: instructors grade many submissions in a row, so even small delays make the product feel slower than manual grading.

#### 2. Calculation Accuracy

This measures whether the displayed total always matches the visible rubric item scores.

- Lean Startup: this is a core value hypothesis, because a grading tool that produces wrong totals destroys trust immediately.
- The Mom Test: asking whether the grader "likes" the feature is weaker than observing whether they double-check the math because they do not trust it.
- Why this matters for willingness to pay: instructors will not rely on a paid grading workflow if they still feel forced to manually recompute totals.

#### 3. Score Visibility During Grading

This measures whether the live total is easy to notice while the grader is entering rubric scores.

- Lean Startup: visible progress supports a faster path to value during a repeated task.
- The Mom Test: if users have to hunt for the total, the layout is already telling you something is wrong.
- Why this matters for willingness to pay: good placement lowers cognitive load and makes the app feel meaningfully faster than spreadsheets or paper rubrics.

### Survey Questions

**Q1. When you changed rubric scores, how quickly did the total score respond on screen?**

Scale: `1 = too slow to trust`, `5 = immediate`

> **Metric covered — Calculation responsiveness:** This question measures whether the live-updating score feels instant enough to support a smooth grading workflow.

Answer: 5 / 5

---

**Q2. How confident were you that the displayed total matched the rubric item scores you entered?**

Scale: `1 = not confident`, `5 = very confident`

> **Metric covered — Calculation accuracy:** This question measures whether the grader trusted the arithmetic enough not to feel the need to manually recompute it.

Answer: 5 / 5

---

**Q3. While grading, how easy was it to keep track of the total score without searching around the page?**

Scale: `1 = hard to find`, `5 = obvious the whole time`

> **Metric covered — Score visibility during grading:** This question measures whether the placement of the total supports quick grading rather than adding unnecessary visual search.

Answer: 4 / 5

---

## Classmate Testing

**Classmate:**  CIci Ge
**Team:** PickMyPlate
**Test date:** 2026-04-07

### Attempt 1 Responses

- **Q1:** 5 / 5
- **Q2:** 5 / 5
- **Q3:** 4 / 5

**Result:** Satisfied

### Notes

- The tester said the score changed immediately after editing rubric inputs, which made the grading flow feel smooth.
- The tester trusted the total because it matched the visible rubric values without needing a manual recomputation.
- The only minor suggestion was to make the total summary stand out a little more visually, since it is clear but not especially prominent.

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

This local markdown file is the accessible copy of the LLM generation log for User Story 10.

### Prompt 1

> Generate a human acceptance test for this implemented behavior: an instructor can open a submission grading page with rubric score inputs, the form shows a per-question subtotal and an overall total score, and those values update automatically as the instructor edits rubric scores without needing a separate calculate button.

### Prompt 2

> Based on that implemented behavior, generate three satisfaction metrics and three survey questions that measure whether the live total feels responsive, accurate, and useful enough that instructors would prefer it over manually summing rubric scores.

### Editing Note

The generated material was manually edited to match the application's actual grading form, including the visible **Total score** summary, per-question subtotals, numeric rubric inputs, and the existing **Save grades** button.
