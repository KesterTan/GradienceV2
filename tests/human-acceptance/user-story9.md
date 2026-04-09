# Human Acceptance Test: Create & Manage Rubric

## User Story
As an instructor, I want to create and manage a rubric for an assignment so that I can grade students consistently and transparently.

## PR Reference
https://github.com/KesterTan/GradienceV2/pull/15

---

## Test Instructions

### Prerequisites
- Instructor and non-instructor accounts exist
- Assignment exists

---

### Steps

#### Create Rubric
1. Log in as Instructor
2. Navigate to assignment
3. Add rubric items:
   - Q1 (10 points)
   - Q2 (15 points)
4. Save rubric

Expected:
- Items appear with name and points
- Rubric is linked to assignment

---

#### Total Score
5. Observe total score

Expected:
- Automatically calculated (25)

---

#### Edit Rubric
6. Update:
   - Q1 → Question 1
   - Points: 10 → 12

Expected:
- Changes reflected
- Total updates correctly

---

#### Delete Rubric Item
7. Delete one item

Expected:
- Item removed
- Total updated

---

#### Authorization
8. Log in as non-instructor

Expected:
- Cannot modify rubric

---

## Metrics

### Task Completion Rate
Measures whether users complete rubric setup without help.

### Time to Configure Rubric
Measures efficiency of repeated grading setup.

### Confidence in Grading Structure
Measures trust in rubric correctness and usability.

---

## Survey

1. How did you verify the total score was correct?

2. Did any part of managing rubric items feel unclear?

3. How comfortable would you feel using this for real grading?

---

## Tester

Name: Andrew

---

## Results

- Completion: Successful
- Time: ~2m 40s

### Responses

Q1:
Checked displayed total against manual sum.

Q2:
Minor hesitation about auto-update behavior.

Q3:
Comfortable using regularly.

---

## Conclusion

The rubric feature meets human acceptance criteria:
- Supports multiple items clearly (Q1, Q2 structure)
- Total score auto-computes correctly
- Editing and deletion behave predictably
- Proper authorization enforced

Status: Accepted
