import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const mocks = vi.hoisted(() => ({
  requireAppUser: vi.fn(),
  getSubmissionGradeForStudent: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/lib/course-management", () => ({
  getSubmissionGradeForStudent: mocks.getSubmissionGradeForStudent,
}))

import StudentSubmissionGradePage from "@/app/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/grade/page"

function createSubmissionGrade(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 40,
    attemptNumber: 1,
    status: "graded",
    submittedAt: "2026-03-10T08:30:00Z",
    textContent: "Answer",
    fileUrl: "https://files.example/submission.pdf",
    studentName: "Stu Dent",
    studentEmail: "stu@example.edu",
    assignmentId: 11,
    assignmentTitle: "Essay 1",
    totalPoints: 10,
    courseId: 7,
    courseTitle: "Writing 101",
    rubricQuestions: [
      {
        questionId: "Q1",
        questionName: "Thesis",
        maxScore: 10,
        rubricItems: [
          { order: 0, criterion: "Clarity", rubricName: "Thesis clarity", maxScore: 4 },
          { order: 1, criterion: "Support", rubricName: "Evidence support", maxScore: 6 },
        ],
      },
    ],
    grade: {
      id: 91,
      totalScore: 8,
      overallFeedback: "Strong work.",
      gradedAt: "2026-03-11T12:00:00Z",
      rubricScores: [
        { displayOrder: 1, pointsAwarded: 3 },
        { displayOrder: 2, pointsAwarded: 5 },
      ],
    },
    ...overrides,
  }
}

describe("student submission grades page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAppUser.mockResolvedValue({
      id: 42,
      firstName: "Stu",
      lastName: "Dent",
      email: "stu@example.edu",
    })
  })

  it("retrieves grades for the authenticated student on page load", async () => {
    mocks.getSubmissionGradeForStudent.mockResolvedValue(createSubmissionGrade())

    await StudentSubmissionGradePage({
      params: Promise.resolve({ courseId: "7", assignmentId: "11", submissionId: "40" }),
    })

    expect(mocks.getSubmissionGradeForStudent).toHaveBeenCalledWith(42, 7, 11, 40)
  })

  it("displays the student total score", async () => {
    mocks.getSubmissionGradeForStudent.mockResolvedValue(createSubmissionGrade())

    const element = await StudentSubmissionGradePage({
      params: Promise.resolve({ courseId: "7", assignmentId: "11", submissionId: "40" }),
    })
    const html = renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(html).toContain("Total score")
    expect(html).toContain("8 / 10")
  })

  it("displays a rubric breakdown by criteria", async () => {
    mocks.getSubmissionGradeForStudent.mockResolvedValue(createSubmissionGrade())

    const element = await StudentSubmissionGradePage({
      params: Promise.resolve({ courseId: "7", assignmentId: "11", submissionId: "40" }),
    })
    const html = renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(html).toContain("Rubric breakdown")
    expect(html).toContain("Clarity")
    expect(html).toContain("Support")
    expect(html).toContain("3 / 4")
    expect(html).toContain("5 / 6")
  })

  it("reflects updated grades when the page is revisited", async () => {
    mocks.getSubmissionGradeForStudent
      .mockResolvedValueOnce(createSubmissionGrade({ grade: { id: 91, totalScore: 7, overallFeedback: "Initial", gradedAt: "2026-03-11T12:00:00Z", rubricScores: [{ displayOrder: 1, pointsAwarded: 3 }, { displayOrder: 2, pointsAwarded: 4 }] } }))
      .mockResolvedValueOnce(createSubmissionGrade({ grade: { id: 91, totalScore: 9, overallFeedback: "Updated", gradedAt: "2026-03-12T10:00:00Z", rubricScores: [{ displayOrder: 1, pointsAwarded: 4 }, { displayOrder: 2, pointsAwarded: 5 }] } }))

    const first = await StudentSubmissionGradePage({
      params: Promise.resolve({ courseId: "7", assignmentId: "11", submissionId: "40" }),
    })
    const firstHtml = renderToStaticMarkup(first as unknown as React.ReactElement)

    const second = await StudentSubmissionGradePage({
      params: Promise.resolve({ courseId: "7", assignmentId: "11", submissionId: "40" }),
    })
    const secondHtml = renderToStaticMarkup(second as unknown as React.ReactElement)

    expect(firstHtml).toContain("7 / 10")
    expect(secondHtml).toContain("9 / 10")
    expect(secondHtml).toContain("Updated")
  })
})
