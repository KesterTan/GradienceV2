import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("@/db/orm", () => ({ db: { select: mocks.select } }))

import {
  getCourseForGrader,
  getSubmissionGradeForStudent,
  listAssignmentsForCourse,
  listCoursesForGrader,
  listSubmissionsForAssessment,
} from "@/lib/course-management"

function createSelectBuilder(rows: unknown[]) {
  const builder: Record<string, unknown> = {}

  ;["from", "leftJoin", "innerJoin", "where", "groupBy"].forEach((name) => {
    builder[name] = vi.fn(() => builder)
  })

  builder.orderBy = vi.fn(async () => rows)
  builder.limit = vi.fn(async () => rows)

  return builder
}

describe("course-management data functions", () => {
  beforeEach(() => {
    mocks.selectQueue.length = 0
    mocks.select.mockImplementation(() => createSelectBuilder(mocks.selectQueue.shift() ?? []))
  })

  it("listCoursesForGrader maps database rows into typed summary objects", async () => {
    mocks.selectQueue.push([
      {
        id: 10,
        title: "CS101",
        startDate: "2026-01-14",
        endDate: "2026-05-14",
        instructors: ["Irene Instructor"],
        studentCount: 2,
        viewerRole: "Instructor",
        assignmentCount: 3,
      },
    ])

    const courses = await listCoursesForGrader(7)

    expect(courses).toEqual([
      {
        id: 10,
        title: "CS101",
        startDate: "2026-01-14",
        endDate: "2026-05-14",
        instructors: ["Irene Instructor"],
        studentCount: 2,
        viewerRole: "Instructor",
        assignmentCount: 3,
      },
    ])
  })

  it("getCourseForGrader returns null when no course is found", async () => {
    mocks.selectQueue.push([])

    const result = await getCourseForGrader(7, 999)

    expect(result).toBeNull()
  })

  it("listAssignmentsForCourse maps assignment fields correctly", async () => {
    mocks.selectQueue.push([
      {
        id: 1,
        title: "Midterm",
        description: null,
        dueAt: "2026-03-01T10:00:00Z",
        submissionCount: 25,
      },
    ])

    const assignments = await listAssignmentsForCourse(7, 1)

    expect(assignments).toEqual([
      {
        id: 1,
        title: "Midterm",
        description: null,
        dueAt: "2026-03-01T10:00:00Z",
        submissionCount: 25,
      },
    ])
  })

  it("listSubmissionsForAssessment maps submission rows correctly", async () => {
    mocks.selectQueue.push([
      {
        id: 88,
        studentMembershipId: 22,
        attemptNumber: 2,
        status: "submitted",
        submittedAt: "2026-03-02T08:30:00Z",
        fileUrl: null,
        studentName: "Stu Student",
        studentEmail: "stu@gradience.edu",
      },
    ])

    const submissions = await listSubmissionsForAssessment(7, 1, 1)

    expect(submissions).toEqual([
      {
        id: 88,
        studentMembershipId: 22,
        attemptNumber: 2,
        status: "submitted",
        submittedAt: "2026-03-02T08:30:00Z",
        fileUrl: null,
        studentName: "Stu Student",
        studentEmail: "stu@gradience.edu",
      },
    ])
  })

  it("returns null for student grade lookup when submission is not accessible to that student", async () => {
    mocks.selectQueue.push([])

    const result = await getSubmissionGradeForStudent(77, 10, 15, 99)

    expect(result).toBeNull()
  })

  it("maps student grade details including total score and rubric breakdown", async () => {
    mocks.selectQueue.push(
      [
        {
          id: 99,
          attemptNumber: 2,
          status: "graded",
          submittedAt: "2026-03-10T08:30:00Z",
          textContent: "My answer",
          fileUrl: "https://files.example/submission.pdf",
          studentName: "Stu Dent",
          studentEmail: "stu@example.edu",
          assignmentId: 15,
          assignmentTitle: "Essay 1",
          totalPoints: 10,
          rubricJson: {
            questions: [
              {
                question_id: "Q1",
                question_name: "Thesis",
                rubric_items: [
                  { criterion: "Clarity", rubric_name: "Thesis clarity", max_score: 4 },
                  { criterion: "Support", rubric_name: "Evidence support", max_score: 6 },
                ],
              },
            ],
          },
          courseId: 10,
          courseTitle: "Writing 101",
          gradeId: 501,
          gradeTotalScore: 8,
          gradeOverallFeedback: "Strong submission.",
          gradeGradedAt: "2026-03-11T12:00:00Z",
        },
      ],
      [
        { displayOrder: 1, pointsAwarded: 3 },
        { displayOrder: 2, pointsAwarded: 5 },
      ],
    )

    const result = await getSubmissionGradeForStudent(77, 10, 15, 99)

    expect(result).toEqual({
      id: 99,
      attemptNumber: 2,
      status: "graded",
      submittedAt: "2026-03-10T08:30:00Z",
      textContent: "My answer",
      fileUrl: "https://files.example/submission.pdf",
      studentName: "Stu Dent",
      studentEmail: "stu@example.edu",
      assignmentId: 15,
      assignmentTitle: "Essay 1",
      totalPoints: 10,
      courseId: 10,
      courseTitle: "Writing 101",
      rubricQuestions: [
        {
          questionId: "Q1",
          questionName: "Thesis",
          maxScore: 10,
          rubricItems: [
            {
              order: 0,
              criterion: "Clarity",
              rubricName: "Thesis clarity",
              maxScore: 4,
            },
            {
              order: 1,
              criterion: "Support",
              rubricName: "Evidence support",
              maxScore: 6,
            },
          ],
        },
      ],
      grade: {
        id: 501,
        totalScore: 8,
        overallFeedback: "Strong submission.",
        gradedAt: "2026-03-11T12:00:00Z",
        rubricScores: [
          { displayOrder: 1, pointsAwarded: 3 },
          { displayOrder: 2, pointsAwarded: 5 },
        ],
      },
    })
  })
})
