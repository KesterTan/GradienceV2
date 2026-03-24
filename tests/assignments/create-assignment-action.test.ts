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
  selectQueue: [] as unknown[][],
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
    mocks.selectQueue.length = 0

    mocks.requireGraderUser.mockResolvedValue({ id: 42, globalRole: "grader" })

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
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

  it("defaults start to now and end to course end when dates are omitted", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-05T12:00:00.000Z"))

    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-01", endDate: "2026-03-10" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      description: "No dates provided",
    })

    await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34")

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        releaseAt: "2026-03-05T12:00:00.000Z",
        dueAt: "2026-03-10T23:59:59.999Z",
      }),
    )

    vi.useRealTimers()
  })

  it("rejects creation when course already ended and dates are omitted (start would be after course end)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-20T12:00:00.000Z"))

    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-01", endDate: "2026-03-10" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?._form?.[0]).toBe(
      "Course has already ended. Cannot create an assignment that starts after the course end date.",
    )
    expect(mocks.insert).not.toHaveBeenCalled()

    vi.useRealTimers()
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
    mocks.selectQueue.push([]) // membership lookup returns empty

    const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?._form?.[0]).toBe("You do not have permission to create assignments for this course.")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("creates an assignment associated to the given course and redirects back to that course", async () => {
    mocks.selectQueue.push(
      [{ id: 999 }], // membership exists
      [{ startDate: "2026-03-01", endDate: "2026-05-01" }], // course range
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      description: "Intro problems",
      startDate: "2026-03-01",
      startTime: "09:30",
      endDate: "2026-03-10",
      endTime: "17:15",
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

  it("requires a start date when start time is provided", async () => {
    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startTime: "09:00",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.startTime?.[0]).toBe("Start date is required when a start time is provided")
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("requires an end date when end time is provided", async () => {
    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      endTime: "17:00",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.endTime?.[0]).toBe("End date is required when an end time is provided")
    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("rejects when start date/time is after end date/time", async () => {
    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-01", endDate: "2026-05-01" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startDate: "2026-03-10",
      startTime: "18:00",
      endDate: "2026-03-10",
      endTime: "09:00",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.endDate?.[0]).toBe("End date/time must be on or after start date/time")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("rejects when assignment start is before course start", async () => {
    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-05", endDate: "2026-05-01" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startDate: "2026-03-01",
      startTime: "00:00",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.startDate?.[0]).toBe("Assignment must start on or after the course start date")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("rejects when assignment end is after course end", async () => {
    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-01", endDate: "2026-03-10" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startDate: "2026-03-05",
      startTime: "09:00",
      endDate: "2026-03-11",
      endTime: "00:00",
    })

    const state = await createAssignmentAction({}, formData)

    expect(state.errors?.endDate?.[0]).toBe("Assignment must end on or before the course end date")
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it("allows assignment start/end exactly on the course boundaries (inclusive)", async () => {
    mocks.selectQueue.push(
      [{ id: 999 }],
      [{ startDate: "2026-03-01", endDate: "2026-03-10" }],
    )

    const formData = createAssignmentFormData({
      courseId: 34,
      title: "HW1",
      startDate: "2026-03-01",
      startTime: "00:00",
      endDate: "2026-03-10",
      endTime: "23:59",
    })

    await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34")
    expect(mocks.insert).toHaveBeenCalledTimes(1)
  })
})

