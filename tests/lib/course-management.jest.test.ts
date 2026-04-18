/**
 * DB mock note: each Drizzle query ends with `.orderBy(...)` or `.limit(...)`.
 * Both call the same queue consumer — push one array per query execution, in call order.
 */
import { beforeEach, describe, expect, jest, test } from "@jest/globals"

const mockSelect = jest.fn()
const selectQueue: unknown[][] = []

const mockParseRubricJson = jest.fn()
const mockFlattenRubricItems = jest.fn()

jest.mock("@/db/orm", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

jest.mock("@/lib/rubrics", () => ({
  parseRubricJson: (...args: unknown[]) => mockParseRubricJson(...args),
  flattenRubricItems: (...args: unknown[]) => mockFlattenRubricItems(...args),
}))

const courseManagement = require("@/lib/course-management") as typeof import("@/lib/course-management")

function makeSelectChain() {
  const chain: Record<string, jest.Mock> = {} as Record<string, jest.Mock>
  const resolveRows = async () => (selectQueue.shift() ?? []) as unknown[]
  chain.from = jest.fn(() => chain)
  chain.leftJoin = jest.fn(() => chain)
  chain.innerJoin = jest.fn(() => chain)
  chain.where = jest.fn(() => chain)
  chain.groupBy = jest.fn(() => chain)
  chain.orderBy = jest.fn(resolveRows)
  chain.limit = jest.fn(resolveRows)
  return chain
}

function baseGradeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 501,
    attemptNumber: 1,
    status: "graded",
    submittedAt: "2026-02-09T00:00:00.000Z",
    textContent: null,
    fileUrl: "/uploads/f.pdf",
    studentName: "Alice A",
    studentEmail: "alice@example.com",
    assignmentId: 7,
    assignmentTitle: "A1",
    totalPoints: 10,
    rubricJson: {},
    courseId: 1,
    courseTitle: "CS101",
    gradeId: null,
    gradeTotalScore: null,
    gradeOverallFeedback: null,
    gradeGradedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  selectQueue.length = 0
  mockSelect.mockImplementation(() => makeSelectChain())
  mockParseRubricJson.mockReturnValue(null)
  mockFlattenRubricItems.mockReturnValue([])
})

describe("course-management", () => {
  describe("courses", () => {
    test("listCoursesForGrader maps rows into CourseSummary objects", async () => {
      selectQueue.push([
        {
          id: 1,
          title: "CS101",
          startDate: "2026-01-01",
          endDate: "2026-05-01",
          instructors: ["Prof A"],
          studentCount: 20,
          viewerRole: "Instructor",
          assignmentCount: 3,
        },
      ])

      const result = await courseManagement.listCoursesForGrader(42)
      expect(result).toEqual([
        {
          id: 1,
          title: "CS101",
          startDate: "2026-01-01",
          endDate: "2026-05-01",
          instructors: ["Prof A"],
          studentCount: 20,
          viewerRole: "Instructor",
          assignmentCount: 3,
        },
      ])
    })

    test("listCoursesForGrader returns empty array when no courses", async () => {
      selectQueue.push([])
      const result = await courseManagement.listCoursesForGrader(42)
      expect(result).toEqual([])
    })

    test("listCoursesForGrader maps zero studentCount and zero assignmentCount", async () => {
      selectQueue.push([
        {
          id: 1,
          title: "Empty",
          startDate: "2026-01-01",
          endDate: "2026-05-01",
          instructors: [],
          studentCount: 0,
          viewerRole: "Instructor",
          assignmentCount: 0,
        },
      ])
      const result = await courseManagement.listCoursesForGrader(42)
      expect(result[0].studentCount).toBe(0)
      expect(result[0].assignmentCount).toBe(0)
    })

    test("getCourseForGrader returns null when no course found (e.g. not a member / wrong id)", async () => {
      selectQueue.push([])
      const result = await courseManagement.getCourseForGrader(42, 1)
      expect(result).toBeNull()
    })

    test("getCourseForGrader returns mapped course detail on success", async () => {
      selectQueue.push([
        {
          id: 1,
          title: "CS101",
          startDate: "2026-01-01",
          endDate: "2026-05-01",
          instructors: ["Prof A", "Prof B"],
          viewerRole: "Instructor",
        },
      ])
      const result = await courseManagement.getCourseForGrader(42, 1)
      expect(result).toEqual({
        id: 1,
        title: "CS101",
        startDate: "2026-01-01",
        endDate: "2026-05-01",
        instructors: ["Prof A", "Prof B"],
        viewerRole: "Instructor",
      })
    })
  })

  describe("assignments / assessments", () => {
    test("listAssignmentsForCourse maps nullable description and numeric fields", async () => {
      selectQueue.push([
        { id: 9, title: "HW1", description: null, dueAt: "2026-03-01T00:00:00.000Z", submissionCount: 5 },
      ])
      const result = await courseManagement.listAssignmentsForCourse(42, 1)
      expect(result[0]).toEqual({
        id: 9,
        title: "HW1",
        description: null,
        dueAt: "2026-03-01T00:00:00.000Z",
        submissionCount: 5,
      })
    })

    test("listAssignmentsForCourse returns empty array when none", async () => {
      selectQueue.push([])
      expect(await courseManagement.listAssignmentsForCourse(42, 1)).toEqual([])
    })

    test("listAssignmentsForCourse maps submissionCount zero", async () => {
      selectQueue.push([
        { id: 1, title: "HW", description: null, dueAt: "2026-03-01T00:00:00.000Z", submissionCount: 0 },
      ])
      const result = await courseManagement.listAssignmentsForCourse(42, 1)
      expect(result[0].submissionCount).toBe(0)
    })

    test("listAssignmentsForCourse maps empty string description to null (falsy branch)", async () => {
      selectQueue.push([
        { id: 1, title: "HW", description: "", dueAt: "2026-03-01T00:00:00.000Z", submissionCount: 0 },
      ])
      const result = await courseManagement.listAssignmentsForCourse(42, 1)
      expect(result[0].description).toBeNull()
    })

    test("listAssignmentsForCourse preserves non-empty description as string", async () => {
      selectQueue.push([
        {
          id: 1,
          title: "HW",
          description: "  notes  ",
          dueAt: "2026-03-01T00:00:00.000Z",
          submissionCount: 1,
        },
      ])
      const result = await courseManagement.listAssignmentsForCourse(42, 1)
      expect(result[0].description).toBe("  notes  ")
    })

    test("getAssessmentForCourseMember maps viewer role and lateUntil", async () => {
      selectQueue.push([
        {
          id: 7,
          title: "A1",
          description: "desc",
          releaseAt: "2026-02-01T00:00:00.000Z",
          dueAt: "2026-02-10T00:00:00.000Z",
          lateUntil: null,
          totalPoints: 50,
          courseId: 1,
          courseTitle: "CS101",
          allowResubmissions: true,
          maxAttemptResubmission: 2,
          viewerRole: "Student",
        },
      ])
      const result = await courseManagement.getAssessmentForCourseMember(42, 1, 7)
      expect(result?.viewerRole).toBe("Student")
      expect(result?.allowResubmissions).toBe(true)
    })

    test("getAssessmentRubricForMember returns null when no row", async () => {
      selectQueue.push([])
      const result = await courseManagement.getAssessmentRubricForMember(42, 1, 7)
      expect(result).toBeNull()
    })

    test("getAssessmentRubricForMember maps assessment rubric details on success", async () => {
      selectQueue.push([
        {
          id: 7,
          title: "A1",
          description: "desc",
          releaseAt: "2026-02-01T00:00:00.000Z",
          dueAt: "2026-02-10T00:00:00.000Z",
          totalPoints: 50,
          courseId: 1,
          courseTitle: "CS101",
          rubricJson: { questions: [] },
          allowResubmissions: true,
          maxAttemptResubmission: 2,
          viewerRole: "Student",
        },
      ])
      const result = await courseManagement.getAssessmentRubricForMember(42, 1, 7)
      expect(result?.rubricJson).toEqual({ questions: [] })
      expect(result?.viewerRole).toBe("Student")
    })

    test("getAssessmentForGrader maps required fields", async () => {
      selectQueue.push([
        {
          id: 7,
          title: "A1",
          description: null,
          releaseAt: "2026-02-01T00:00:00.000Z",
          dueAt: "2026-02-10T00:00:00.000Z",
          lateUntil: "2026-02-12T00:00:00.000Z",
          totalPoints: 50,
          courseId: 1,
          courseTitle: "CS101",
          allowResubmissions: false,
          maxAttemptResubmission: 0,
        },
      ])
      const result = await courseManagement.getAssessmentForGrader(42, 1, 7)
      expect(result?.lateUntil).toBe("2026-02-12T00:00:00.000Z")
      expect(result?.courseTitle).toBe("CS101")
    })

    test("getAssessmentForGrader returns null when grader has no access (no row)", async () => {
      selectQueue.push([])
      const result = await courseManagement.getAssessmentForGrader(99, 1, 7)
      expect(result).toBeNull()
    })
  })

  describe("submissions", () => {
    test("listSubmissionsForAssessment maps student submission rows", async () => {
      selectQueue.push([
        {
          id: 100,
          studentMembershipId: 11,
          attemptNumber: 2,
          status: "submitted",
          submittedAt: "2026-02-09T00:00:00.000Z",
          fileUrl: "/uploads/file.pdf",
          studentName: "Alice A",
          studentEmail: "alice@example.com",
        },
      ])
      const result = await courseManagement.listSubmissionsForAssessment(42, 1, 7)
      expect(result[0].studentName).toBe("Alice A")
      expect(result[0].attemptNumber).toBe(2)
    })

    test("listSubmissionsForAssessment returns empty when unauthorized or no rows", async () => {
      selectQueue.push([])
      const result = await courseManagement.listSubmissionsForAssessment(42, 1, 7)
      expect(result).toEqual([])
    })

    test("listStudentsWithoutSubmission maps active students", async () => {
      selectQueue.push([{ studentMembershipId: 22, studentName: "Bob B", studentEmail: "bob@example.com" }])
      const result = await courseManagement.listStudentsWithoutSubmission(42, 1, 7)
      expect(result).toEqual([{ studentMembershipId: 22, studentName: "Bob B", studentEmail: "bob@example.com" }])
    })

    test("listStudentsWithoutSubmission returns empty when none", async () => {
      selectQueue.push([])
      expect(await courseManagement.listStudentsWithoutSubmission(42, 1, 7)).toEqual([])
    })

    test("getSubmissionForGrader returns submission detail", async () => {
      selectQueue.push([
        {
          id: 501,
          attemptNumber: 1,
          status: "submitted",
          submittedAt: "2026-02-09T00:00:00.000Z",
          textContent: null,
          fileUrl: "/uploads/f.pdf",
          studentName: "Alice A",
          studentEmail: "alice@example.com",
          assignmentId: 7,
          assignmentTitle: "A1",
          courseId: 1,
          courseTitle: "CS101",
        },
      ])
      const result = await courseManagement.getSubmissionForGrader(42, 1, 7, 501)
      expect(result?.assignmentTitle).toBe("A1")
      expect(result?.id).toBe(501)
    })

    test("getSubmissionForGrader returns null when grader cannot access (no row)", async () => {
      selectQueue.push([])
      expect(await courseManagement.getSubmissionForGrader(42, 1, 7, 501)).toBeNull()
    })

    test("getSubmissionForGrader maps textContent with null fileUrl", async () => {
      selectQueue.push([
        {
          id: 501,
          attemptNumber: 1,
          status: "submitted",
          submittedAt: "2026-02-09T00:00:00.000Z",
          textContent: "Hello",
          fileUrl: null,
          studentName: "Alice A",
          studentEmail: "alice@example.com",
          assignmentId: 7,
          assignmentTitle: "A1",
          courseId: 1,
          courseTitle: "CS101",
        },
      ])
      const result = await courseManagement.getSubmissionForGrader(42, 1, 7, 501)
      expect(result?.textContent).toBe("Hello")
      expect(result?.fileUrl).toBeNull()
    })

    test("getSubmissionForGrader maps fileUrl with null textContent", async () => {
      selectQueue.push([
        {
          id: 501,
          attemptNumber: 1,
          status: "submitted",
          submittedAt: "2026-02-09T00:00:00.000Z",
          textContent: null,
          fileUrl: "/x.pdf",
          studentName: "Alice A",
          studentEmail: "alice@example.com",
          assignmentId: 7,
          assignmentTitle: "A1",
          courseId: 1,
          courseTitle: "CS101",
        },
      ])
      const result = await courseManagement.getSubmissionForGrader(42, 1, 7, 501)
      expect(result?.textContent).toBeNull()
      expect(result?.fileUrl).toBe("/x.pdf")
    })

    test("listMemberSubmissionHistory marks first row as current when DB returns newest-first order", async () => {
      selectQueue.push([
        {
          id: 1,
          attemptNumber: 2,
          status: "submitted",
          submittedAt: "2026-02-10T00:00:00.000Z",
          fileUrl: "/uploads/a.pdf",
        },
        {
          id: 2,
          attemptNumber: 1,
          status: "submitted",
          submittedAt: "2026-02-09T00:00:00.000Z",
          fileUrl: "/uploads/b.pdf",
        },
      ])
      const result = await courseManagement.listMemberSubmissionHistory(42, 1, 7)
      expect(result[0].isCurrent).toBe(true)
      expect(result[1].isCurrent).toBe(false)
    })

    test("listMemberSubmissionHistory: isCurrent follows result row order, not attemptNumber (documents SQL ordering dependency)", async () => {
      selectQueue.push([
        { id: 2, attemptNumber: 1, submittedAt: "2026-02-09T00:00:00.000Z", status: "submitted", fileUrl: null },
        { id: 1, attemptNumber: 2, submittedAt: "2026-02-10T00:00:00.000Z", status: "submitted", fileUrl: null },
      ])
      const result = await courseManagement.listMemberSubmissionHistory(42, 1, 7)
      expect(result[0].id).toBe(2)
      expect(result[0].isCurrent).toBe(true)
      expect(result[1].id).toBe(1)
      expect(result[1].isCurrent).toBe(false)
    })

    test("listMemberSubmissionHistory returns empty array when no attempts", async () => {
      selectQueue.push([])
      const result = await courseManagement.listMemberSubmissionHistory(42, 1, 7)
      expect(result).toEqual([])
    })
  })

  describe("grading", () => {
    test("getSubmissionGradeForGrader builds rubric questions and grade", async () => {
      selectQueue.push(
        [
          baseGradeRow({
            rubricJson: { questions: [] },
            gradeId: 900,
            gradeTotalScore: 8,
            gradeOverallFeedback: "good",
            gradeGradedAt: "2026-02-10T00:00:00.000Z",
          }),
        ],
        [{ displayOrder: 1, pointsAwarded: 4 }],
      )
      mockParseRubricJson.mockReturnValue({
        questions: [
          {
            question_id: "Q1",
            question_name: "Question 1",
            rubric_items: [{ criterion: "c", rubric_name: "r", max_score: 5 }],
          },
        ],
      })
      mockFlattenRubricItems.mockReturnValue([
        { question_order: 0, order: 0, criterion: "c", rubric_name: "r", max_score: 5 },
      ])

      const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
      expect(mockParseRubricJson).toHaveBeenCalled()
      expect(result?.rubricQuestions.length).toBe(1)
      expect(result?.grade?.totalScore).toBe(8)
      expect(result?.grade?.rubricScores[0]).toEqual({ displayOrder: 1, pointsAwarded: 4, comment: null })
    })

    test("getSubmissionGradeForGrader returns null grade when no grade row (gradeId null)", async () => {
      selectQueue.push([
        baseGradeRow({
          rubricJson: { questions: [] },
          gradeId: null,
          gradeTotalScore: null,
          gradeOverallFeedback: null,
          gradeGradedAt: null,
        }),
      ])
      mockParseRubricJson.mockReturnValue({ questions: [] })
      mockFlattenRubricItems.mockReturnValue([])

      const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
      expect(result?.grade).toBeNull()
      expect(result?.rubricQuestions).toEqual([])
      expect(selectQueue.length).toBe(0)
    })

    test("getSubmissionGradeForGrader keeps grade with empty rubricScores when second query returns no rows", async () => {
      selectQueue.push(
        [
          baseGradeRow({
            rubricJson: { questions: [] },
            gradeId: 900,
            gradeTotalScore: 8,
            gradeOverallFeedback: null,
            gradeGradedAt: "2026-02-10T00:00:00.000Z",
          }),
        ],
        [],
      )
      mockParseRubricJson.mockReturnValue({ questions: [{ question_id: "Q1", question_name: "Q", rubric_items: [] }] })
      mockFlattenRubricItems.mockReturnValue([])

      const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
      expect(result?.grade?.rubricScores).toEqual([])
      expect(result?.grade?.totalScore).toBe(8)
    })

    test("getSubmissionGradeForGrader uses empty rubricQuestions when parseRubricJson returns null", async () => {
      selectQueue.push([baseGradeRow({ gradeId: null })])
      mockParseRubricJson.mockReturnValue(null)
      const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
      expect(result?.rubricQuestions).toEqual([])
    })

    test("getSubmissionGradeForGrader maps multiple questions and preserves score row order from DB", async () => {
      selectQueue.push(
        [
          baseGradeRow({
            gradeId: 1,
            gradeTotalScore: 10,
            gradeOverallFeedback: "ok",
            gradeGradedAt: "2026-02-10T00:00:00.000Z",
          }),
        ],
        [
          { displayOrder: 2, pointsAwarded: 3 },
          { displayOrder: 1, pointsAwarded: 7 },
        ],
      )
      mockParseRubricJson.mockReturnValue({
        questions: [
          { question_id: "Q1", question_name: "One", rubric_items: [{ criterion: "a", rubric_name: "r1", max_score: 5 }] },
          { question_id: "Q2", question_name: "Two", rubric_items: [{ criterion: "b", rubric_name: "r2", max_score: 5 }] },
        ],
      })
      mockFlattenRubricItems.mockReturnValue([
        { question_order: 0, order: 0, criterion: "a", rubric_name: "r1", max_score: 5 },
        { question_order: 1, order: 1, criterion: "b", rubric_name: "r2", max_score: 5 },
      ])

      const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
      expect(result?.rubricQuestions).toHaveLength(2)
      expect(result?.rubricQuestions[0].questionId).toBe("Q1")
      expect(result?.rubricQuestions[1].questionId).toBe("Q2")
      expect(result?.grade?.rubricScores).toEqual([
        { displayOrder: 2, pointsAwarded: 3, comment: null },
        { displayOrder: 1, pointsAwarded: 7, comment: null },
      ])
    })

    test("getSubmissionGradeForGrader propagates when parseRubricJson throws", async () => {
      selectQueue.push([baseGradeRow()])
      mockParseRubricJson.mockImplementation(() => {
        throw new Error("invalid rubric")
      })
      await expect(courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)).rejects.toThrow("invalid rubric")
    })

    test("getSubmissionGradeForGrader propagates when flattenRubricItems throws", async () => {
      selectQueue.push([baseGradeRow()])
      mockParseRubricJson.mockReturnValue({ questions: [{ question_id: "Q", question_name: "N", rubric_items: [] }] })
      mockFlattenRubricItems.mockImplementation(() => {
        throw new Error("flatten failed")
      })
      await expect(courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)).rejects.toThrow("flatten failed")
    })

    test("getSubmissionGradeForStudent returns null when query returns no row (wrong student / no access)", async () => {
      selectQueue.push([])
      const result = await courseManagement.getSubmissionGradeForStudent(42, 1, 7, 501)
      expect(result).toBeNull()
    })

    test("getSubmissionGradeForStudent builds rubric questions and grade", async () => {
      selectQueue.push(
        [
          baseGradeRow({
            rubricJson: { questions: [] },
            gradeId: 900,
            gradeTotalScore: 8,
            gradeOverallFeedback: "good",
            gradeGradedAt: "2026-02-10T00:00:00.000Z",
          }),
        ],
        [{ displayOrder: 1, pointsAwarded: 4 }],
      )
      mockParseRubricJson.mockReturnValue({
        questions: [
          {
            question_id: "Q1",
            question_name: "Question 1",
            rubric_items: [{ criterion: "c", rubric_name: "r", max_score: 5 }],
          },
        ],
      })
      mockFlattenRubricItems.mockReturnValue([
        { question_order: 0, order: 0, criterion: "c", rubric_name: "r", max_score: 5 },
      ])

      const result = await courseManagement.getSubmissionGradeForStudent(42, 1, 7, 501)
      expect(result?.rubricQuestions.length).toBe(1)
      expect(result?.grade?.totalScore).toBe(8)
    })

    test("getSubmissionGradeForStudent returns null grade when gradeId is null", async () => {
      selectQueue.push([baseGradeRow({ gradeId: null })])
      mockParseRubricJson.mockReturnValue({ questions: [] })
      const result = await courseManagement.getSubmissionGradeForStudent(42, 1, 7, 501)
      expect(result?.grade).toBeNull()
    })
  })
})
