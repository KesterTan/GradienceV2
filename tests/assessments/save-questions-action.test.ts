import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAppUser: vi.fn(),
  uploadQuestionsJsonToS3: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/lib/s3-submissions", () => ({
  buildQuestionsS3ObjectKey: ({ courseId, assignmentId }: { courseId: number; assignmentId: number }) =>
    `questions/assessments/${courseId}/${assignmentId}/questions.json`,
  uploadQuestionsJsonToS3: mocks.uploadQuestionsJsonToS3,
}))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    update: () => ({ set: mocks.updateSet }),
  },
}))

import { saveQuestionsAction } from "@/app/courses/[courseId]/assessments/[assignmentId]/questions/actions"

const baseQuestion = {
  question_id: "Q1",
  question_text: "What is a monad?",
  question_max_total: 10,
}

function makeFormData(opts?: {
  courseId?: string
  assignmentId?: string
  questionsPayload?: unknown
}) {
  const fd = new FormData()
  fd.set("courseId", opts?.courseId ?? "5")
  fd.set("assignmentId", opts?.assignmentId ?? "12")
  if (opts?.questionsPayload !== undefined) {
    fd.set("questionsPayload", JSON.stringify(opts.questionsPayload))
  }
  return fd
}

function validPayload(extra?: object) {
  return {
    assignment_title: "",
    course: "",
    instructions_summary: "",
    questions: [{ ...baseQuestion, ...extra }],
  }
}

describe("saveQuestionsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0

    mocks.requireAppUser.mockResolvedValue({ id: 42 })
    mocks.uploadQuestionsJsonToS3.mockResolvedValue(undefined)

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => {
      const chain = {
        innerJoin: () => chain,
        where: () => ({ limit: mocks.selectLimit }),
        from: () => chain,
      }
      return { from: () => chain }
    })

    mocks.updateWhere.mockResolvedValue(undefined)
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere })
  })

  // ── auth / ID validation ──────────────────────────────────────────────────

  it("returns _form error for non-numeric courseId", async () => {
    const result = await saveQuestionsAction({}, makeFormData({ courseId: "abc" }))
    expect(result.errors?._form?.[0]).toMatch(/invalid course or assignment id/i)
    expect(mocks.uploadQuestionsJsonToS3).not.toHaveBeenCalled()
  })

  it("returns _form error for non-numeric assignmentId", async () => {
    const result = await saveQuestionsAction({}, makeFormData({ assignmentId: "xyz" }))
    expect(result.errors?._form?.[0]).toMatch(/invalid course or assignment id/i)
  })

  // ── permission check ──────────────────────────────────────────────────────

  it("returns permission error when user is not a grader", async () => {
    mocks.selectQueue.push([]) // membership query → empty → not grader

    const result = await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))
    expect(result.errors?._form?.[0]).toMatch(/do not have permission/i)
    expect(mocks.uploadQuestionsJsonToS3).not.toHaveBeenCalled()
  })

  // ── payload validation ────────────────────────────────────────────────────

  it("returns questionsPayload error when formData entry is missing", async () => {
    mocks.selectQueue.push([{ id: 99 }]) // membership → grader
    const fd = new FormData()
    fd.set("courseId", "5")
    fd.set("assignmentId", "12")
    // no questionsPayload

    const result = await saveQuestionsAction({}, fd)
    expect(result.errors?.questionsPayload?.[0]).toBeDefined()
  })

  it("returns questionsPayload error for invalid JSON string", async () => {
    mocks.selectQueue.push([{ id: 99 }])
    const fd = new FormData()
    fd.set("courseId", "5")
    fd.set("assignmentId", "12")
    fd.set("questionsPayload", "{ not valid json ,,, }")

    const result = await saveQuestionsAction({}, fd)
    expect(result.errors?.questionsPayload?.[0]).toMatch(/valid JSON/i)
  })

  it("returns fieldErrors for empty question_text", async () => {
    mocks.selectQueue.push([{ id: 99 }])
    const result = await saveQuestionsAction(
      {},
      makeFormData({
        questionsPayload: validPayload({ question_text: "" }),
      }),
    )
    expect(result.errors?.fieldErrors?.["questions.0.question_text"]?.[0]).toBe(
      "Question text is required",
    )
  })

  it("returns fieldErrors for empty question_id", async () => {
    mocks.selectQueue.push([{ id: 99 }])
    const result = await saveQuestionsAction(
      {},
      makeFormData({
        questionsPayload: validPayload({ question_id: "" }),
      }),
    )
    expect(result.errors?.fieldErrors?.["questions.0.question_id"]?.[0]).toBe(
      "Question ID is required",
    )
  })

  it("returns fieldErrors for zero-length questions array", async () => {
    mocks.selectQueue.push([{ id: 99 }])
    const result = await saveQuestionsAction(
      {},
      makeFormData({
        questionsPayload: { ...validPayload(), questions: [] },
      }),
    )
    expect(result.errors?.fieldErrors).toBeDefined()
  })

  // ── assignment lookup ─────────────────────────────────────────────────────

  it("returns _form error when assignment is not found (first lookup)", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }], // membership → grader
      [],           // assignment existence check → not found
    )
    const result = await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))
    expect(result.errors?._form?.[0]).toMatch(/assessment not found/i)
    expect(mocks.uploadQuestionsJsonToS3).not.toHaveBeenCalled()
  })

  it("returns _form error when metadata join query returns empty", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],  // membership
      [{ id: 12 }],  // assignment exists
      [],             // metadata join → empty
    )
    const result = await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))
    expect(result.errors?._form?.[0]).toMatch(/assessment not found/i)
    expect(mocks.uploadQuestionsJsonToS3).not.toHaveBeenCalled()
  })

  // ── S3 failure ────────────────────────────────────────────────────────────

  it("returns _form error when S3 upload throws", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "Midterm", description: "desc", courseTitle: "CS101" }],
    )
    mocks.uploadQuestionsJsonToS3.mockRejectedValue(new Error("S3 down"))

    const result = await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))
    expect(result.errors?._form?.[0]).toMatch(/unable to save questions/i)
    expect(mocks.updateSet).not.toHaveBeenCalled()
  })

  // ── happy path ────────────────────────────────────────────────────────────

  it("returns success with savedQuestions on valid grader request", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "Midterm", description: "Desc", courseTitle: "CS101" }],
    )

    const result = await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))

    expect(result.success).toBe(true)
    expect(result.savedQuestions).toHaveLength(1)
    expect(result.savedQuestions?.[0].question_id).toBe("Q1")
    expect(result.errors).toBeUndefined()
  })

  it("calls uploadQuestionsJsonToS3 with correct key and enriched payload", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "Final Exam", description: "All topics", courseTitle: "Algorithms" }],
    )

    await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))

    expect(mocks.uploadQuestionsJsonToS3).toHaveBeenCalledWith(
      expect.objectContaining({
        objectKey: "questions/assessments/5/12/questions.json",
        questionsJson: expect.objectContaining({
          assignment_title: "Final Exam",
          course: "Algorithms",
          instructions_summary: "All topics",
          questions: [expect.objectContaining({ question_id: "Q1" })],
        }),
      }),
    )
  })

  it("persists enriched payload to DB via update", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "HW1", description: "", courseTitle: "Math" }],
    )

    await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))

    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        questionsJson: expect.objectContaining({
          assignment_title: "HW1",
          questions: expect.arrayContaining([
            expect.objectContaining({ question_id: "Q1" }),
          ]),
        }),
      }),
    )
    expect(mocks.updateWhere).toHaveBeenCalled()
  })

  it("preserves is_extra_credit in savedQuestions", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "Quiz", description: "", courseTitle: "Physics" }],
    )

    const result = await saveQuestionsAction(
      {},
      makeFormData({ questionsPayload: validPayload({ is_extra_credit: true }) }),
    )

    expect(result.savedQuestions?.[0].is_extra_credit).toBe(true)
  })

  it("calls revalidatePath for the assessment page", async () => {
    mocks.selectQueue.push(
      [{ id: 99 }],
      [{ id: 12 }],
      [{ title: "T", description: "", courseTitle: "C" }],
    )

    await saveQuestionsAction({}, makeFormData({ questionsPayload: validPayload() }))

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses/5/assessments/12")
  })
})
