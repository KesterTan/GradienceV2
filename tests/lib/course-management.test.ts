import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}))

vi.mock("@/db/db", () => ({ query: mocks.query }))

import {
  getCourseForGrader,
  listAssignmentsForCourse,
  listCoursesForGrader,
  listSubmissionsForAssessment,
} from "@/lib/course-management"

describe("course-management data functions", () => {
  it("listCoursesForGrader maps database rows into typed summary objects", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "10",
          title: "CS101",
          start_date: "2026-01-14",
          end_date: "2026-05-14",
          instructors: ["Irene Instructor"],
          student_count: "2",
          viewer_role: "Instructor",
          assignment_count: "3",
        },
      ],
    })

    const courses = await listCoursesForGrader(7)

    expect(mocks.query).toHaveBeenCalledWith(expect.any(String), [7])
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
    mocks.query.mockResolvedValueOnce({ rows: [] })

    const result = await getCourseForGrader(7, 999)

    expect(result).toBeNull()
  })

  it("listAssignmentsForCourse maps assignment fields correctly", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        { id: "1", title: "Midterm", due_at: "2026-03-01T10:00:00Z", submission_count: "25" },
      ],
    })

    const assignments = await listAssignmentsForCourse(7, 1)

    expect(assignments).toEqual([
      {
        id: 1,
        title: "Midterm",
        dueAt: "2026-03-01T10:00:00Z",
        submissionCount: 25,
      },
    ])
  })

  it("listSubmissionsForAssessment maps submission rows correctly", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "88",
          attempt_number: "2",
          status: "submitted",
          submitted_at: "2026-03-02T08:30:00Z",
          student_name: "Stu Student",
          student_email: "stu@gradience.edu",
        },
      ],
    })

    const submissions = await listSubmissionsForAssessment(7, 1, 1)

    expect(submissions).toEqual([
      {
        id: 88,
        attemptNumber: 2,
        status: "submitted",
        submittedAt: "2026-03-02T08:30:00Z",
        studentName: "Stu Student",
        studentEmail: "stu@gradience.edu",
      },
    ])
  })
})
