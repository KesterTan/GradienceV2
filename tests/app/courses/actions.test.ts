import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  requireGraderUser: vi.fn(),
  withConnection: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/current-user", () => ({ requireGraderUser: mocks.requireGraderUser }))
vi.mock("@/db/db", () => ({ withConnection: mocks.withConnection }))

import { createCourseAction } from "@/app/courses/actions"

type QueryCall = [sql: string, args?: unknown[]]

describe("createCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireGraderUser.mockResolvedValue({ id: 42, globalRole: "grader" })
  })

  it("returns validation errors when title is missing", async () => {
    const formData = new FormData()
    formData.set("title", "")

    const state = await createCourseAction({}, formData)

    expect(state.errors?.title?.[0]).toBe("Course title is required")
    expect(mocks.withConnection).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("returns validation errors when end date is before start date", async () => {
    const formData = new FormData()
    formData.set("title", "CS101")
    formData.set("startDate", "2026-05-10")
    formData.set("endDate", "2026-05-01")

    const state = await createCourseAction({}, formData)

    expect(state.errors?.endDate?.[0]).toBe("End date must be on or after start date")
    expect(mocks.withConnection).not.toHaveBeenCalled()
  })

  it("inserts a course and creator membership, then revalidates and redirects", async () => {
    const query = vi.fn(async (sql: string, _args?: unknown[]) => {
      if (sql.includes("INSERT INTO gradience.courses")) {
        return { rows: [{ id: 123 }] }
      }
      return { rows: [] }
    })

    mocks.withConnection.mockImplementation(async (fn: (client: { query: typeof query }) => Promise<unknown>) =>
      fn({ query }),
    )

    const formData = new FormData()
    formData.set("title", "CS101 - Intro to Computer Science")
    formData.set("startDate", "2026-01-14")
    formData.set("endDate", "2026-05-14")

    await expect(createCourseAction({}, formData)).rejects.toThrow("REDIRECT:/courses")

    const courseInsertCall = query.mock.calls.find((call: QueryCall) =>
      String(call[0]).includes("INSERT INTO gradience.courses"),
    )
    const membershipInsertCall = query.mock.calls.find((call: QueryCall) =>
      String(call[0]).includes("INSERT INTO gradience.course_memberships"),
    )

    expect(courseInsertCall).toBeTruthy()
    expect(membershipInsertCall).toBeTruthy()
    if (!courseInsertCall?.[1] || !membershipInsertCall?.[1]) {
      throw new Error("Expected SQL args to be present")
    }
    expect(courseInsertCall[1][0]).toBe("CS101 - Intro to Computer Science")
    expect(courseInsertCall[1][4]).toBe(42)
    expect(membershipInsertCall[1]).toEqual([123, 42])

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses")
    expect(mocks.redirect).toHaveBeenCalledWith("/courses")
  })
})
