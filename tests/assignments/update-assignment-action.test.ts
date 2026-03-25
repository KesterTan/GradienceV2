import { beforeEach, describe, expect, it, vi } from "vitest"
import { createAssignmentFormData } from "./fixtures"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  requireAppUser: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
  },
}))

import { updateAssignmentAction } from "@/app/courses/[courseId]/assessments/actions"

function createUpdateFormData(params: {
  courseId: number
  assignmentId: number
  title?: string
  description?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
}) {
  const formData = createAssignmentFormData({
    courseId: params.courseId,
    title: params.title,
    description: params.description,
    startDate: params.startDate,
    startTime: params.startTime,
    endDate: params.endDate,
    endTime: params.endTime,
  })
  formData.set("assignmentId", String(params.assignmentId))
  return formData
}

describe("updateAssignmentAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0

    mocks.requireAppUser.mockResolvedValue({ id: 42, globalRole: "grader" })

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }),
    }))

    mocks.updateWhere.mockResolvedValue(undefined)
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere })
    mocks.update.mockReturnValue({ set: mocks.updateSet })
  })

  it("returns validation errors when title is missing and preserves values", async () => {
    const formData = createUpdateFormData({ courseId: 34, assignmentId: 7, title: "" })

    const state = await updateAssignmentAction({}, formData)

    expect(state.errors?.title?.[0]).toBe("Assignment title is required")
    expect(state.values).toEqual(expect.objectContaining({ courseId: "34", assignmentId: "7", title: "" }))
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("denies updates when grader has no active grader membership", async () => {
    mocks.selectQueue.push([]) // membership lookup

    const formData = createUpdateFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
    const state = await updateAssignmentAction({}, formData)

    expect(state.errors?._form?.[0]).toBe("You do not have permission to edit assignments for this course.")
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("rejects when assignment is not found for the course", async () => {
    mocks.selectQueue.push(
      [{ id: 999, role: "grader" }], // membership ok
      [], // assignment lookup empty
    )

    const formData = createUpdateFormData({ courseId: 34, assignmentId: 9999, title: "HW1" })
    const state = await updateAssignmentAction({}, formData)

    expect(state.errors?._form?.[0]).toBe("Assignment not found.")
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("updates assignment fields and redirects back to assessment page", async () => {
    mocks.selectQueue.push(
      [{ id: 999, role: "grader" }], // membership ok
      [{ id: 7, releaseAt: "2026-03-02T09:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }], // existing assignment
      [{ startDate: "2026-03-01", endDate: "2026-05-01" }], // course range
    )

    const formData = createUpdateFormData({
      courseId: 34,
      assignmentId: 7,
      title: "HW1 Updated",
      description: "New desc",
      startDate: "2026-03-03",
      startTime: "10:30",
      endDate: "2026-03-10",
      endTime: "18:00",
    })

    await expect(updateAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34/assessments/7")

    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "HW1 Updated",
        description: "New desc",
        releaseAt: "2026-03-03T10:30:00.000Z",
        dueAt: "2026-03-10T18:00:00.000Z",
      }),
    )

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses/34/assessments/7")
    expect(mocks.redirect).toHaveBeenCalledWith("/courses/34/assessments/7")
  })

  it("enforces course range when explicit end is after course end", async () => {
    mocks.selectQueue.push(
      [{ id: 999, role: "grader" }],
      [{ id: 7, releaseAt: "2026-03-02T09:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
      [{ startDate: "2026-03-01", endDate: "2026-03-10" }],
    )

    const formData = createUpdateFormData({
      courseId: 34,
      assignmentId: 7,
      title: "HW1",
      startDate: "2026-03-05",
      startTime: "09:00",
      endDate: "2026-03-11",
      endTime: "00:00",
    })

    const state = await updateAssignmentAction({}, formData)
    expect(state.errors?.endDate?.[0]).toBe(
      "Assignment must end on or before the course end date. Valid course date range is 2026-03-01 to 2026-03-10.",
    )
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
