# Human Acceptance Tests — User Story 7

---

## User Story 7.1: Upload a PDF for an Assignment

### Prerequisites
- The application is running:
  ```
  npm run build
  npm run start
  ```
- An **Instructor** account exists and is logged in first to set up:
  - A course has been created.
  - At least one assignment exists in that course with a due date in the future.
- A **Student** account exists and has been added as an active member of that course (status: active, role: student).
- The student is logged in.

### Steps
1. Navigate to the home/dashboard page after logging in.
2. Click on the course that contains the assignment.
3. On the course dashboard, locate the assignment and click its title or the link to open its detail page.
4. On the assignment detail page, you will see a **"Submit a new version"** card with a dashed upload area labeled "Click to select a PDF".
5. Click the dashed upload area (or the "Click to select a PDF" text) to open a file picker dialog.
6. Select a `.pdf` file from your computer. Files must be PDF format and 25 MB or smaller. If you select a non-PDF file, an error message will appear and the file will be rejected.
7. The selected file name will appear inside the dashed area confirming your selection.
8. Click the **"Submit Assignment"** button below the upload area.
9. Wait for the upload to complete. A green success message **"New submission uploaded."** will appear below the upload area.
10. The **"Submission history"** card below will update to show Version 1 with a "Current" badge, a timestamp, and a "View PDF" link.

### Survey Questions

**Q1. How easy was it to follow the UI to complete the steps on a scale from 1 to 5?**

> **Metric covered — Upload success on first attempt:** This question measures whether the upload flow (the dashed upload area, file picker, and submit button) is intuitive enough that a user can complete it without confusion or retrying. A score of 4 or 5 indicates the interface guided the user successfully on the first attempt.

Answer: 5 / 5 - similar to gradescope, so easy to follow

---

**Q2. How many errors did you hit when you were trying to navigate this feature?**

> **Metric covered — Error encounter rate:** This question surfaces whether the user ran into any client-side or server-side errors (e.g., wrong file type warning, file too large, silent failure). Identifying what errors occurred and at which step reveals whether the system's constraints are communicated clearly enough before the user attempts submission.

Answer: 0 errors

---

**Q3. How confident are you on a scale from 1 to 5 that your submission went through?**

> **Metric covered — Confidence in submission receipt:** This question measures whether the system's success feedback (the green "New submission uploaded." message and the updated submission history card) is convincing enough that the user does not feel the need to re-verify by refreshing the page or clicking "View PDF". A score below 4 suggests the post-submission feedback needs to be stronger.

Answer: 5 / 5 - saw a submission message + can view pdf.

---

### Overall Result

- [x] Pass
- [ ] Fail

**Notes:**

&nbsp;

&nbsp;

---

## User Story 7.2: Resubmit an Assignment Before the Deadline

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. An **Instructor** account exists and is logged in first to set up:
   - A course has been created.
   - At least one assignment exists in that course with a due date in the future.
   - The assignment must have been created with **"Allow resubmissions"** enabled, and **"Maximum resubmissions"** set to a value of 2 or more.
3. A **Student** account exists and has been added as an active member of that course (status: active, role: student). The student is logged in and:
   - The student has already submitted at least one version (Version 1 exists).

### Steps
1. Make sure you are logged in as the student and navigate to the course dashboard.
2. Click on the assignment to open its detail page.
3. The **"Submission history"** card at the bottom will show your existing submission(s) (e.g., Version 1 – Current).
4. In the **"Submit a new version"** card, click the dashed upload area to open a file picker.
5. Select a new or updated `.pdf` file (max 25 MB).
6. Click **"Submit Assignment"**.
7. A green success message **"New submission uploaded."** confirms the resubmission.
8. The submission history card updates: the new upload appears as **Version 2** with the "Current" badge, and the previous Version 1 remains in history without the "Current" badge.

### Survey Questions

**Q1. How clear was it that you were able to submit again on a scale from 1 to 5?**

> **Metric covered — Discoverability of the resubmit flow:** This question measures whether the upload area, button states, and submission history made it clear that submitting again was possible and that the new version would become the active one. A low score indicates the interface does not communicate resubmission behavior clearly enough for a user to act without hesitation.

Answer: 5 / 5 - upload pdf not disabled so it made sense.

---

**Q2. How many errors did you hit when you tried to resubmit?**

> **Metric covered — Error or block encountered when attempting to resubmit:** This question identifies whether the user ran into any unexpected barriers — such as a submission cap they were unaware of, a confusing disabled state, or a technical error — when trying to submit again. Unexpected blocks that the user cannot interpret represent a gap between system behavior and what the interface communicates upfront.

Answer: 0 errors

---

**Q3. How confident are you on a scale from 1 to 5 that your resubmission is the active submission?**

> **Metric covered — Clarity of submission state after resubmitting:** This question measures whether the "Current" badge, version numbering, and updated submission history card are convincing enough that the user is certain their newest upload is the one that will be graded, without needing to take additional steps to verify.

Answer: 5 / 5 - "current" badge easily visible.

---

### Overall Result

- [x] Pass
- [ ] Fail

**Notes:**

&nbsp;

&nbsp;

---

## User Story 7.3: Restore a Previous Version of a Submission

### Prerequisites
1. The application is running:
   - `npm run build`
   - `npm run start`
2. An **Instructor** account exists and is logged in first to set up:
   - A course has been created.
   - At least one assignment exists in that course with a due date in the future.
   - The assignment must have been created with **"Allow resubmissions"** enabled, and **"Maximum resubmissions"** set to a value of 2 or more.
   - The assignment must have a resubmission slot remaining — confirm that the submission cap has not been reached (restoring counts as a new attempt).
3. A **Student** account exists and has been added as an active member of that course (status: active, role: student). The student is logged in and:
   - The student has already submitted at least 2 versions.

### Steps
1. Make sure you're logged in as the student and navigate to the assignment detail page.
2. Scroll to the **"Submission history"** card at the bottom of the page.
3. You will see a list of all your submissions. The most recent one has a "Current" badge. Older versions are listed below it without that badge.
4. Find the older version you want to restore (e.g., Version 1).
5. Click the **"Restore"** button (with a circular arrow icon) next to that older version.
6. The button will show **"Restoring..."** while the operation runs.
7. A green success message **"A new version was created from the selected submission."** appears.
8. The submission history updates: a new entry (e.g., Version 3) appears at the top with the "Current" badge. It contains the same PDF file as the version you restored from. The previous "current" version (Version 2) is now in history without the "Current" badge.
9. You can click **"View PDF"** on the new current version to confirm it shows the restored file.

### Survey Questions

**Q1. How easy was it on a scale of 1 to 5 to find the restore button?**

> **Metric covered — Discoverability of the restore button:** This question measures whether the "Restore" button is visible and interpretable without being told it exists. A low score indicates that the button's placement, label, or visual weight is not prominent enough for a user to notice it independently while browsing their submission history.

Answer: 5 / 5 - logical placement, logo helped.

---

**Q2. When you clicked the restore button, how close on a scale from 1 to 5 was the expected behavior to what actually happened?**

> **Metric covered — Expectation-to-outcome alignment for restore:** This question measures whether the user's mental model of "restore" matched the system's actual behavior — creating a new version entry that copies the selected file, rather than overwriting or deleting anything. A low score reveals a gap between what the label and surrounding UI imply and what the feature actually does.

Answer: 5 / 5 - understands what restore does because of gradescope.

---

**Q3. How confident are you on a scale from 1 to 5 that this submission has been successfully restored?**

> **Metric covered — Adequacy of post-restore feedback:** This question measures whether the system's confirmation — the success message and the updated submission history showing a new "Current" version — was sufficient for the user to be certain the restore worked correctly, without needing to click "View PDF" or take any additional verification steps.

Answer: 5 / 5 - could see a new submission row for the restored pdf.

---

### Overall Result

- [x] Pass
- [ ] Fail