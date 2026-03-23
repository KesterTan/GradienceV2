import { beforeEach, describe, expect, it, vi } from "vitest"
import { createAssignmentFormData } from "./fixtures"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  requireGraderUser: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  membershipQueue: [] as unknown[][],
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/current-user", () => ({ requireGraderUser: mocks.requireGraderUser }))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
  },
}))

import { createAssignmentAction } from "@/app/courses/[courseId]/assessments/actions"

describe("createAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.membershipQueue.length = 0

    mocks.requireGraderUser.mockResolvedValue({ id: 42, globalRole: "grader" })

    mocks.selectLimit.mockImplementation(async () => (mocks.membershipQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }),
    }))

    mocks.insertValues.mockResolvedValue(undefined)
    mocks.insert.mockReturnValue({ values: mocks.insertValues })
  })

  it("returns validation errors when title is missing", async () => {
    const formData = createAssignmentFormData({ courseId: 34, title: "" })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.title?.[0]).toBe("Assignment title is required")
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it("returns validation errors when end date is before start date", async () => {
    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startDate: "2026-05-10",
      endDate: "2026-05-01",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.endDate?.[0]).toBe("End date must be on or after start date")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("rejects users who are not graders (requireGraderUser redirect)", async () => {
    mocks.requireGraderUser.mockImplementation(() => {
      throw new Error("REDIRECT:/login?error=unauthorized")
    })

    const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })

    await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/login?error=unauthorized")
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("denies creation when grader has no active grader membership in the course", async () => {
    mocks.membershipQueue.push([]) // membership lookup returns empty

    const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?._form?.[0]).toBe("You do not have permission to create assignments for this course.")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("creates an assignment associated to the given course and redirects back to that course", async () => {
    mocks.membershipQueue.push([{ id: 999 }]) // membership exists

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      description: "Intro problems",
      startDate: "2026-03-01",
      endDate: "2026-03-10",
    })

    await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34")

    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        courseId: 34,
        title: "HW1",
        description: "Intro problems",
        createdByUserId: 42,
      }),
    )

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses/34")
    expect(mocks.redirect).toHaveBeenCalledWith("/courses/34")
  })
})

