# Human Acceptance Tests — User Story 8

User: Christine Truong

---

## User Story 8.1: Allow Students to Submit After the Deadline with a Late Status

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. An **Instructor** account exists and is logged in to set up:
   - A course has been created.
   - An assignment is created with:
     - A regular due date set a few minutes in the future (so you can test both on-time and late submission windows).
     - **"Enable late deadline"** checked.
     - A **"Late deadline date"** and **"Late deadline time"** set to at least 30 minutes after the regular due date.
3. A **Student** account exists and has been added as an active member of that course (status: active, role: student).
4. The student is logged in.

### Steps

#### Part A: Verify the late window is communicated to the student (before the regular deadline)
1. Log in as the student and navigate to the assignment detail page.
2. Confirm the assignment info card shows the regular due date and, below it in amber, **"Late submissions accepted until [late deadline date and time]"**.
3. Confirm the upload area is active and no warning banners are shown yet.

#### Part B: Submit during the late window (after the regular deadline, before the late deadline)
4. Wait until the regular due date has passed (or temporarily edit the assignment to set the due date in the past while keeping the late deadline in the future).
5. As the student, navigate to the assignment detail page.
6. Confirm an amber warning banner now reads: **"You are past the deadline — this submission will be marked as late."**
7. Confirm the upload area is still active (not grayed out or disabled).
8. Click the upload area, select a `.pdf` file (max 25 MB), and click **"Submit Assignment"**.
9. Confirm a green success message appears: **"New submission uploaded."**
10. Confirm the **"Submission history"** card shows Version 1 with a **"late"** status label styled in amber.

#### Part C: Verify submissions are blocked after the late deadline
11. Edit the assignment so the late deadline is also in the past.
12. Log in as the student and navigate to the assignment page.
13. Confirm the upload area is fully disabled and a red banner reads: **"The deadline for this assignment has passed. Submissions are closed."**

### Survey Questions

**Q1. On a scale from 1 to 5, how convinced were you that you are currently allowed to submit, with 1 being "I am confident I cannot submit" and 5 being "I am confident I can submit"?**

> **Metric covered — Clarity of submission window state communicated to the student:** This question measures whether the UI makes it unambiguous to the student whether they are currently allowed to submit — whether the window is open, in the late period, or fully closed. A score of 1 indicates the student was uncertain or incorrectly believed they could not submit; a score of 5 indicates the interface communicated their eligibility clearly without requiring them to guess.

Answer: 5 / 5 - region to upload the pdf was still enabled, so believed that i could submit.

---

**Q2. How clearly on a scale from 1 to 5 did the system distinguish late submissions from on-time submissions?**

> **Metric covered — Visual distinction between late and on-time submissions:** This question measures whether the amber background, amber "late" label, and status badge on the instructor's student submission cards make it immediately apparent which submissions were late without requiring the instructor to check timestamps or open individual submissions.

Answer: 5 / 5 - yellow badges were distinct.

---

**Q3. How convinced were you on a scale from 1 to 5 that you were allowed to submit during the late window?**

> **Metric covered — Clarity of the late window indicator:** This question measures whether the amber "You are past the deadline — this submission will be marked as late." warning banner, combined with the "Late submissions accepted until..." line on the assignment info card, made it sufficiently clear to the student that they were specifically inside the late window — not just that submission was possible, but that they were past the regular deadline and within a grace period.

Answer: 5 / 5 - deadline clearly shown, amber theme helped (rather than red).

---

### Overall Result

- [x] Pass
- [ ] Fail

**Notes:**

&nbsp;

&nbsp;

---

## User Story 8.2: View All Students and Their Submissions for an Assignment

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. An **Instructor** account exists and is logged in.
3. A course exists with the instructor as a member (role: grader or instructor).
4. An assignment exists in that course.
5. The course has at least **3 student members** (status: active, role: student) set up as follows:
   - **Student A** has submitted at least 2 versions (one should be a late submission if possible, for status variety).
   - **Student B** has submitted exactly 1 version (on-time).
   - **Student C** has not submitted anything.
6. The instructor is logged in.

### Steps
1. Navigate to the assignment detail page as the instructor.
2. Scroll past the **"Submit a new version"** and **"Submission history"** cards to the **"Student submissions"** section.
3. Confirm that Student A and Student B each have a submission card showing their name and email as the card title.
4. Confirm that Student C appears as a card showing their name and email with a **"No submission"** badge and no version entries.
5. Confirm all student cards are listed in **alphabetical order** by name.

### Survey Questions

**Q1. How easy was it on a scale from 1 to 5 to find all the student submissions?**

> **Metric covered — Scannability of the complete student submission list:** This question measures whether the "Student submissions" section — with individual cards per student showing name, email, version, and status — allows an instructor to take in the full picture of all submissions at once without confusion, excessive scrolling, or needing to open individual entries to understand the overall state of the class.

Answer: 5 / 5 - very natural to navigate to, clicking on the assignment immediately showed it. intuitive.

---

**Q2. How clearly on a scale from 1 to 5 could you identify which students had not yet submitted?**

> **Metric covered — Completeness of submission status visibility:** This question measures whether students without any submission are rendered visibly enough — as named cards with a "No submission" badge — that an instructor can scan the list and immediately identify who is missing without cross-referencing a separate roster.

Answer: 5 / 5 - very clear card with "no submission" label.

---

**Q3. How quickly on a scale from 1 to 5 could you determine whether a student's current submission was on-time or late?**

> **Metric covered — Legibility of submission status badges:** This question measures whether the color-coded status labels ("submitted" in green, "late" in amber) and the amber card background on late submissions allow an instructor to assess submission status at a glance, without needing to open the submission or check timestamps manually.

Answer: 5 / 5 - could easily find the yellow badges.

---

### Overall Result

- [x] Pass
- [ ] Fail

