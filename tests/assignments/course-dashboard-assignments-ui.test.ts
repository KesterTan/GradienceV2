import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

const mocks = vi.hoisted(() => ({
  requireGraderUser: vi.fn(),
  getCourseForGrader: vi.fn(),
  listAssignmentsForCourse: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("@/lib/current-user", () => ({ requireGraderUser: mocks.requireGraderUser }))
vi.mock("@/lib/course-management", () => ({
  getCourseForGrader: mocks.getCourseForGrader,
  listAssignmentsForCourse: mocks.listAssignmentsForCourse,
}))

import CourseDashboardPage from "@/app/courses/[courseId]/page"

describe("Course dashboard assignments UI", () => {
  it("shows the create assessment link and renders assignments returned for that course", async () => {
    mocks.requireGraderUser.mockResolvedValue({
      id: 42,
      firstName: "Irene",
      lastName: "Instructor",
      email: "irene@gradience.edu",
      globalRole: "grader",
    })

    mocks.getCourseForGrader.mockResolvedValue({
      id: 34,
      title: "Intro to Systems",
      startDate: "2026-03-01",
      endDate: "2026-05-01",
      instructors: ["Irene Instructor"],
    })

    mocks.listAssignmentsForCourse.mockResolvedValue([
      {
        id: 7,
        title: "HW1",
        dueAt: "2026-03-10T23:59:59.999Z",
        submissionCount: 0,
      },
    ])

    const element = await CourseDashboardPage({
      params: Promise.resolve({ courseId: "34" }),
    })

    const html = renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(html).toContain("/courses/34/assessments/new")
    expect(html).toContain("HW1")
    expect(html).toContain("/courses/34/assessments/7")
  })
})

