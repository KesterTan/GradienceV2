import { beforeEach, expect, jest, test } from "@jest/globals"

const mockRevalidatePath = jest.fn()
const mockRedirect = jest.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`)
})
const mockRequireAppUser = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockInsertValues = jest.fn()
const mockUpdate = jest.fn()
const mockUpdateSet = jest.fn()
const mockUpdateWhere = jest.fn()
const selectQueue: unknown[][] = []

jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

jest.mock("@/lib/current-user", () => ({
  requireAppUser: (...args: unknown[]) => mockRequireAppUser(...args),
}))

jest.mock("@/db/orm", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

const { createAssignmentAction, updateAssignmentAction } = require("@/app/courses/[courseId]/assessments/actions") as typeof import("@/app/courses/[courseId]/assessments/actions")

function createAssignmentFormData(params: {
  courseId: number
  assignmentId?: number
  title?: string
  description?: string
  startDate?: string
  startTime?: string
  endDate?: string
  endTime?: string
  enableLateDeadline?: boolean
  lateUntilDate?: string
  lateUntilTime?: string
  allowResubmissions?: boolean
  maxAttemptResubmission?: string
}) {
  const formData = new FormData()
  formData.set("courseId", String(params.courseId))
  if (typeof params.assignmentId === "number") {
    formData.set("assignmentId", String(params.assignmentId))
  }
  formData.set("title", params.title ?? "HW1")
  formData.set("description", params.description ?? "")
  formData.set("startDate", params.startDate ?? "")
  formData.set("startTime", params.startTime ?? "")
  formData.set("endDate", params.endDate ?? "")
  formData.set("endTime", params.endTime ?? "")
  formData.set("enableLateDeadline", params.enableLateDeadline ? "on" : "")
  formData.set("lateUntilDate", params.lateUntilDate ?? "")
  formData.set("lateUntilTime", params.lateUntilTime ?? "")
  formData.set("allowResubmissions", params.allowResubmissions ? "on" : "")
  formData.set("maxAttemptResubmission", params.maxAttemptResubmission ?? "")
  return formData
}

beforeEach(() => {
  jest.clearAllMocks()
  selectQueue.length = 0

  mockRequireAppUser.mockResolvedValue({ id: 42 })

  mockSelect.mockImplementation(() => ({
    from: () => ({
      where: () => ({
        limit: async () => (selectQueue.shift() ?? []) as unknown[],
      }),
    }),
  }))

  mockInsertValues.mockResolvedValue(undefined)
  mockInsert.mockReturnValue({ values: mockInsertValues })
  mockUpdateWhere.mockResolvedValue(undefined)
  mockUpdateSet.mockReturnValue({ where: mockUpdateWhere })
  mockUpdate.mockReturnValue({ set: mockUpdateSet })
})

test("createAssignmentAction returns lateUntilDate error when late deadline date/time is not after due date/time", async () => {
  // function: createAssignmentAction
  // input: due=2026-03-10 17:00, late=2026-03-09 16:00
  // expected output: errors.lateUntilDate[0] = "Late deadline must be after the normal deadline."
  selectQueue.push(
    [{ id: 999 }],
    [{ startDate: "2026-03-01", endDate: "2026-03-31" }],
  )

  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-05",
    startTime: "09:00",
    endDate: "2026-03-10",
    endTime: "17:00",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-09",
    lateUntilTime: "16:00",
  })

  const state = await createAssignmentAction({}, formData)

  expect(state.errors?.lateUntilDate?.[0]).toBe("Late deadline must be after the normal deadline.")
  expect(mockInsert).not.toHaveBeenCalled()
  expect(mockRevalidatePath).not.toHaveBeenCalled()
  expect(mockRedirect).not.toHaveBeenCalled()
})

test("createAssignmentAction returns lateUntilTime error for same-day late deadline time conflict", async () => {
  // function: createAssignmentAction
  // input: due=2026-03-10 17:00, late=2026-03-10 16:00 (same day)
  // expected output: errors.lateUntilTime[0] = same-day late-time validation message
  selectQueue.push(
    [{ id: 999 }],
    [{ startDate: "2026-03-01", endDate: "2026-03-31" }],
  )

  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-05",
    startTime: "09:00",
    endDate: "2026-03-10",
    endTime: "17:00",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-10",
    lateUntilTime: "16:00",
  })

  const state = await createAssignmentAction({}, formData)

  expect(state.errors?.lateUntilTime?.[0]).toBe(
    "Late deadline time must be after the normal deadline time when on the same date.",
  )
  expect(mockInsert).not.toHaveBeenCalled()
})

test("createAssignmentAction returns validation error when title is missing", async () => {
  const formData = createAssignmentFormData({ courseId: 34, title: "" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.title?.[0]).toBe("Assignment title is required")
  expect(mockInsert).not.toHaveBeenCalled()
})

test("createAssignmentAction denies when user is not an active grader member", async () => {
  selectQueue.push([])
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe("You do not have permission to create assignments for this course.")
  expect(mockInsert).not.toHaveBeenCalled()
})

test("createAssignmentAction creates assignment and redirects on success", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ startDate: "2026-03-01", endDate: "2026-04-01" }],
  )

  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    description: "Intro",
    startDate: "2026-03-05",
    startTime: "09:00",
    endDate: "2026-03-10",
    endTime: "17:00",
  })

  await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34")
  expect(mockInsertValues).toHaveBeenCalledWith(
    expect.objectContaining({
      courseId: 34,
      title: "HW1",
      description: "Intro",
      createdByUserId: 42,
    }),
  )
  expect(mockRevalidatePath).toHaveBeenCalledWith("/courses/34")
})

test("createAssignmentAction enforces at least 1 max resubmission when enabled", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ startDate: "2026-03-01", endDate: "2026-04-01" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    allowResubmissions: true,
    maxAttemptResubmission: "0",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
  })
  await expect(createAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34")
  expect(mockInsertValues).toHaveBeenCalledWith(
    expect.objectContaining({ allowResubmissions: true, maxAttemptResubmission: 1 }),
  )
})

test("updateAssignmentAction returns error when assignmentId is invalid", async () => {
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })
  formData.set("assignmentId", "not-a-number")
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.assignmentId?.[0]).toBe("Invalid assignment id")
  expect(mockUpdate).not.toHaveBeenCalled()
})

test("updateAssignmentAction returns error when assignment not found", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [],
  )
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe("Assignment not found.")
  expect(mockUpdate).not.toHaveBeenCalled()
})

test("updateAssignmentAction updates assignment and redirects on success", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2026-03-01", endDate: "2026-04-01" }],
  )

  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1 Updated",
    description: "Updated",
    startDate: "2026-03-06",
    startTime: "10:00",
    endDate: "2026-03-12",
    endTime: "17:30",
  })

  await expect(updateAssignmentAction({}, formData)).rejects.toThrow("REDIRECT:/courses/34/assessments/7")
  expect(mockUpdateSet).toHaveBeenCalledWith(
    expect.objectContaining({
      title: "HW1 Updated",
      description: "Updated",
      releaseAt: "2026-03-06T10:00:00.000Z",
      dueAt: "2026-03-12T17:30:00.000Z",
    }),
  )
  expect(mockRevalidatePath).toHaveBeenCalledWith("/courses/34/assessments/7")
})

test("updateAssignmentAction denies when user is not an active grader member", async () => {
  selectQueue.push([])
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe("You do not have permission to edit assignments for this course.")
  expect(mockUpdate).not.toHaveBeenCalled()
})

test("createAssignmentAction requires startDate when startTime is provided", async () => {
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1", startTime: "09:00" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.startTime?.[0]).toBe("Start date is required when a start time is provided")
})

test("createAssignmentAction requires endDate when endTime is provided", async () => {
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1", endTime: "17:00" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endTime?.[0]).toBe("End date is required when an end time is provided")
})

test("createAssignmentAction rejects endDate before startDate", async () => {
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-10",
    endDate: "2026-03-01",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endDate?.[0]).toBe("End date must be on or after start date")
})

test("createAssignmentAction rejects endTime before startTime on same day", async () => {
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-10",
    startTime: "18:00",
    endDate: "2026-03-10",
    endTime: "09:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endTime?.[0]).toBe(
    "End time must be on or after start time when start and end date are the same",
  )
})

test("createAssignmentAction rejects invalid courseId", async () => {
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })
  formData.set("courseId", "abc")
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.courseId?.[0]).toBe("Invalid course id")
})

test("createAssignmentAction returns course not found", async () => {
  selectQueue.push([{ id: 999 }], [])
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe("Course not found.")
})

test("createAssignmentAction returns ended-course error when dates are omitted and course is historically ended", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2000-01-01", endDate: "2000-01-10" }])
  const formData = createAssignmentFormData({ courseId: 34, title: "HW1" })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe(
    "Course has already ended. Cannot create an assignment that starts after the course end date.",
  )
})

test("createAssignmentAction enforces course-range start lower bound", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2026-03-05", endDate: "2026-03-20" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-01",
    startTime: "09:00",
    endDate: "2026-03-10",
    endTime: "17:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.startDate?.[0]).toContain("Assignment must start on or after the course start date.")
})

test("createAssignmentAction requires lateUntilDate when late deadline enabled", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2026-03-01", endDate: "2026-03-31" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    enableLateDeadline: true,
    lateUntilDate: "",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toBe(
    "Late deadline date is required when late deadline is enabled.",
  )
})

test("createAssignmentAction prioritizes due-vs-late ordering when late date is before course start", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2026-03-05", endDate: "2026-03-31" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-10",
    endDate: "2026-03-20",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-01",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toBe("Late deadline must be after the normal deadline.")
})

test("createAssignmentAction enforces late deadline not after course end", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2026-03-01", endDate: "2026-03-20" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-30",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toContain("Late deadline must be on or before")
})

test("updateAssignmentAction validates title required", async () => {
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "" })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.title?.[0]).toBe("Assignment title is required")
})

test("updateAssignmentAction rejects invalid courseId", async () => {
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
  formData.set("courseId", "abc")
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.courseId?.[0]).toBe("Invalid course id")
})

test("updateAssignmentAction returns course not found", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [],
  )
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe("Course not found.")
})

test("updateAssignmentAction returns ended-course error when dates omitted and course is historically ended", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2000-01-01T00:00:00.000Z", dueAt: "2000-01-10T23:59:59.999Z" }],
    [{ startDate: "2000-01-01", endDate: "2000-01-10" }],
  )
  const formData = createAssignmentFormData({ courseId: 34, assignmentId: 7, title: "HW1" })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?._form?.[0]).toBe(
    "Course has already ended. Cannot update an assignment to start after the course end date.",
  )
})

test("updateAssignmentAction enforces late deadline required when enabled", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2026-03-01", endDate: "2026-03-31" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    enableLateDeadline: true,
    lateUntilDate: "",
  })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toBe(
    "Late deadline date is required when late deadline is enabled.",
  )
})

test("createAssignmentAction returns endDate ordering error when derived start is after explicit end", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2000-01-01", endDate: "2100-12-31" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    endDate: "2020-01-01",
    endTime: "00:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endDate?.[0]).toBe("End date/time must be on or after start date/time")
})

test("createAssignmentAction enforces explicit start not after course end", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2099-03-01", endDate: "2099-03-20" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    startDate: "2099-03-25",
    startTime: "10:00",
    endDate: "2099-03-30",
    endTime: "10:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.startDate?.[0]).toContain("Assignment must start on or before the course end date.")
})

test("createAssignmentAction enforces explicit end not after course end", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2099-03-01", endDate: "2099-03-20" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    endDate: "2099-03-25",
    endTime: "10:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endDate?.[0]).toContain("Assignment must end on or before the course end date.")
})

test("createAssignmentAction enforces explicit end not before course start", async () => {
  selectQueue.push([{ id: 999 }], [{ startDate: "2099-03-10", endDate: "2099-03-20" }])
  const formData = createAssignmentFormData({
    courseId: 34,
    title: "HW1",
    endDate: "2099-03-05",
    endTime: "10:00",
  })
  const state = await createAssignmentAction({}, formData)
  expect(state.errors?.endDate?.[0]).toContain("Assignment must end on or after the course start date.")
})

test("updateAssignmentAction returns range-ordering error when derived start is after explicit end", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2000-01-01", endDate: "2100-12-31" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1",
    endDate: "2020-01-01",
    endTime: "00:00",
  })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.endDate?.[0]).toBe("End date/time must be on or after start date/time")
})

test("updateAssignmentAction returns same-day late deadline time conflict", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2026-03-01", endDate: "2026-03-31" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    endTime: "17:00",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-10",
    lateUntilTime: "16:00",
  })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.lateUntilTime?.[0]).toBe(
    "Late deadline time must be after the normal deadline time when on the same date.",
  )
})

test("updateAssignmentAction enforces late deadline not after course end", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2026-03-01", endDate: "2026-03-20" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-30",
  })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toContain("Late deadline must be on or before")
})

test("updateAssignmentAction returns lateUntilDate error when late deadline is before due date on a different day", async () => {
  selectQueue.push(
    [{ id: 999 }],
    [{ id: 7, releaseAt: "2026-03-01T00:00:00.000Z", dueAt: "2026-03-10T23:59:59.999Z" }],
    [{ startDate: "2026-03-01", endDate: "2026-03-31" }],
  )
  const formData = createAssignmentFormData({
    courseId: 34,
    assignmentId: 7,
    title: "HW1",
    startDate: "2026-03-05",
    endDate: "2026-03-10",
    endTime: "17:00",
    enableLateDeadline: true,
    lateUntilDate: "2026-03-09",
    lateUntilTime: "12:00",
  })
  const state = await updateAssignmentAction({}, formData)
  expect(state.errors?.lateUntilDate?.[0]).toBe("Late deadline must be after the normal deadline.")
})
