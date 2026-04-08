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
  const chain: any = {}
  chain.from = jest.fn(() => chain)
  chain.leftJoin = jest.fn(() => chain)
  chain.innerJoin = jest.fn(() => chain)
  chain.where = jest.fn(() => chain)
  chain.groupBy = jest.fn(() => chain)
  chain.orderBy = jest.fn(async () => (selectQueue.shift() ?? []) as unknown[])
  chain.limit = jest.fn(async () => (selectQueue.shift() ?? []) as unknown[])
  return chain
}

beforeEach(() => {
  jest.clearAllMocks()
  selectQueue.length = 0
  mockSelect.mockImplementation(() => makeSelectChain())
})

describe("course-management", () => {
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

  test("getCourseForGrader returns null when no course found", async () => {
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

  test("listStudentsWithoutSubmission maps active students", async () => {
    selectQueue.push([{ studentMembershipId: 22, studentName: "Bob B", studentEmail: "bob@example.com" }])
    const result = await courseManagement.listStudentsWithoutSubmission(42, 1, 7)
    expect(result).toEqual([{ studentMembershipId: 22, studentName: "Bob B", studentEmail: "bob@example.com" }])
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

  test("getSubmissionGradeForGrader builds rubric questions and grade", async () => {
    selectQueue.push(
      [
        {
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
          rubricJson: { questions: [] },
          courseId: 1,
          courseTitle: "CS101",
          gradeId: 900,
          gradeTotalScore: 8,
          gradeOverallFeedback: "good",
          gradeGradedAt: "2026-02-10T00:00:00.000Z",
        },
      ],
      [{ displayOrder: 1, pointsAwarded: 4 }],
    )
    mockParseRubricJson.mockReturnValue({
      questions: [{ question_id: "Q1", question_name: "Question 1", rubric_items: [{ criterion: "c", rubric_name: "r", max_score: 5 }] }],
    })
    mockFlattenRubricItems.mockReturnValue([
      { question_order: 0, order: 0, criterion: "c", rubric_name: "r", max_score: 5 },
    ])

    const result = await courseManagement.getSubmissionGradeForGrader(42, 1, 7, 501)
    expect(result?.rubricQuestions.length).toBe(1)
    expect(result?.grade?.totalScore).toBe(8)
    expect(result?.grade?.rubricScores[0]).toEqual({ displayOrder: 1, pointsAwarded: 4 })
  })

  test("getSubmissionGradeForStudent returns null when student cannot access submission", async () => {
    selectQueue.push([])
    const result = await courseManagement.getSubmissionGradeForStudent(42, 1, 7, 501)
    expect(result).toBeNull()
  })

  test("getSubmissionGradeForStudent builds rubric questions and grade", async () => {
    selectQueue.push(
      [
        {
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
          rubricJson: { questions: [] },
          courseId: 1,
          courseTitle: "CS101",
          gradeId: 900,
          gradeTotalScore: 8,
          gradeOverallFeedback: "good",
          gradeGradedAt: "2026-02-10T00:00:00.000Z",
        },
      ],
      [{ displayOrder: 1, pointsAwarded: 4 }],
    )
    mockParseRubricJson.mockReturnValue({
      questions: [{ question_id: "Q1", question_name: "Question 1", rubric_items: [{ criterion: "c", rubric_name: "r", max_score: 5 }] }],
    })
    mockFlattenRubricItems.mockReturnValue([
      { question_order: 0, order: 0, criterion: "c", rubric_name: "r", max_score: 5 },
    ])

    const result = await courseManagement.getSubmissionGradeForStudent(42, 1, 7, 501)
    expect(result?.rubricQuestions.length).toBe(1)
    expect(result?.grade?.totalScore).toBe(8)
    expect(result?.grade?.rubricScores[0]).toEqual({ displayOrder: 1, pointsAwarded: 4 })
  })

  test("listMemberSubmissionHistory marks first row as current", async () => {
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
})
