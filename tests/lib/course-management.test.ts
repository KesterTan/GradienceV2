import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("@/db/orm", () => ({ db: { select: mocks.select } }))

import {
  getCourseForGrader,
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
})
