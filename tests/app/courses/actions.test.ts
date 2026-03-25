import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  requireAppUser: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/db/orm", () => ({ db: { transaction: mocks.transaction } }))

import { createCourseAction } from "@/app/courses/actions"

describe("createCourseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAppUser.mockResolvedValue({ id: 42, globalRole: "grader" })
  })

  it("returns validation errors when title is missing", async () => {
    const formData = new FormData()
    formData.set("title", "")

    const state = await createCourseAction({}, formData)

    expect(state.errors?.title?.[0]).toBe("Course title is required")
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("returns validation errors when end date is before start date", async () => {
    const formData = new FormData()
    formData.set("title", "CS101")
    formData.set("startDate", "2026-05-10")
    formData.set("endDate", "2026-05-01")

    const state = await createCourseAction({}, formData)

    expect(state.errors?.endDate?.[0]).toBe("End date must be on or after start date")
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("inserts a course and creator membership, then revalidates and redirects", async () => {
    const insert = vi.fn()
    const courseValues = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: 123 }]),
    })
    const membershipValues = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    })

    insert.mockReturnValueOnce({ values: courseValues })
    insert.mockReturnValueOnce({ values: membershipValues })

    mocks.transaction.mockImplementation(async (fn: (tx: { insert: typeof insert }) => Promise<unknown>) =>
      fn({ insert }),
    )

    const formData = new FormData()
    formData.set("title", "CS101 - Intro to Computer Science")
    formData.set("startDate", "2026-01-14")
    formData.set("endDate", "2026-05-14")

    await expect(createCourseAction({}, formData)).rejects.toThrow("REDIRECT:/courses")

    expect(courseValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "CS101 - Intro to Computer Science",
        createdByUserId: 42,
        startDate: "2026-01-14",
        endDate: "2026-05-14",
      }),
    )
    expect(membershipValues).toHaveBeenCalledWith({
      courseId: 123,
      userId: 42,
      role: "grader",
      status: "active",
    })

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses")
    expect(mocks.redirect).toHaveBeenCalledWith("/courses")
  })
})
