# Human Acceptance Test: Edit & Delete Course Details

## User Story
As an instructor, I want to edit and delete course details so that I can keep my course information accurate and remove courses that are no longer needed.

## PR Reference
https://github.com/KesterTan/GradienceV2/pull/14

---

## Test Instructions

### Prerequisites
- Instructor and non-instructor accounts exist
- At least one course exists with details

---

### Steps

#### Edit Course
1. Log in as Instructor
2. Navigate to Course Management
3. Select a course
4. Click Edit
5. Update course name and dates
6. Save changes

Expected:
- Changes appear immediately

---

#### Persistence
7. Refresh page

Expected:
- Changes persist

---

#### Delete Course
8. Delete the course
9. Confirm deletion

Expected:
- Course disappears

---

#### Cascade Deletion
10. Attempt to access related assignments/submissions

Expected:
- Data is removed

---

#### Authorization
11. Log in as non-instructor

Expected:
- Cannot edit or delete

---

## Metrics

### Task Completion Rate
Measures whether users successfully complete tasks without help.

### Time to Complete Task
Measures efficiency and UX clarity.

### Confidence in Outcome
Measures trust in system correctness and reliability.

---

## Survey

1. When you edited the course, what did you check to confirm your changes were saved?

2. Was there any step where you hesitated or weren’t sure what to do next?

3. If you were managing multiple real courses, how comfortable would you feel relying on this feature?

---

## Tester

Name: Andrew

---

## Results

- Completion: Successful
- Time: ~2m 15s

### Responses

Q1:
Refreshed page and rechecked course details.

Q2:
Minor hesitation before deletion.

Q3:
Comfortable using regularly, cautious with deletion.

---

## Conclusion

The feature meets all human acceptance criteria:
- Editing is intuitive
- Changes persist reliably
- Deletion works correctly with cascade behavior
- Authorization is enforced

Status: Accepted
