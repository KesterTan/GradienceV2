import { beforeEach, afterEach, describe, expect, jest, test } from "@jest/globals"

const mockRequireAppUser = jest.fn()
const mockLoadJsonFromS3ObjectKey = jest.fn()
const mockSelect = jest.fn()
const selectQueue: unknown[][] = []

jest.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  eq: (...args: unknown[]) => args,
}))

jest.mock("@/lib/current-user", () => ({
  requireAppUser: (...args: unknown[]) => mockRequireAppUser(...args),
}))

jest.mock("@/lib/s3-submissions", () => ({
  loadJsonFromS3ObjectKey: (...args: unknown[]) => mockLoadJsonFromS3ObjectKey(...args),
}))

jest.mock("@/db/schema", () => ({
  assignments: { id: "assignments.id", courseId: "assignments.courseId" },
  courseMemberships: {
    id: "courseMemberships.id",
    courseId: "courseMemberships.courseId",
    userId: "courseMemberships.userId",
    role: "courseMemberships.role",
    status: "courseMemberships.status",
  },
}))

jest.mock("@/db/orm", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}))

const { generateRubricSuggestionAction } = require("@/lib/rubric-suggestion") as typeof import("@/lib/rubric-suggestion")

function createFormData(params: { courseId: string; assignmentId: string }) {
  const formData = new FormData()
  formData.set("courseId", params.courseId)
  formData.set("assignmentId", params.assignmentId)
  return formData
}

describe("generateRubricSuggestionAction", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.clearAllMocks()
    selectQueue.length = 0

    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      ALLOW_INSECURE_AI: "true",
      AI_RUBRIC_SUGGEST_API_URL: "http://localhost:8080/rubric-suggest",
      API_SECRET_TOKEN: "test-secret-token",
    }

    mockRequireAppUser.mockResolvedValue({ id: 42 })
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: async () => (selectQueue.shift() ?? []) as unknown[],
        }),
      }),
    }))

    mockLoadJsonFromS3ObjectKey.mockResolvedValue(null)

    ;(global.fetch as unknown as jest.Mock) = jest.fn()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test("returns rubric payload when AI service responds with valid rubric JSON", async () => {
    selectQueue.push([{ id: 1 }], [{ id: 10 }])
    mockLoadJsonFromS3ObjectKey.mockResolvedValueOnce({
      questions: [{ id: "Q1", text: "Explain MVC" }],
    })

    ;(global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          questions: [
            {
              question_id: "Q1",
              rubric_items: [
                { criterion: "Accuracy", explanation: "Correct concepts", max_score: 5 },
                { criterion: "Examples", explanation: "Real-world examples", max_score: 3 },
              ],
            },
          ],
          overall_feedback: "Solid structure",
        }),
    })

    const result = await generateRubricSuggestionAction(
      {},
      createFormData({ courseId: "7", assignmentId: "10" }),
    )

    expect(result.errors).toBeUndefined()
    expect(result.rubric).toEqual({
      questions: [
        {
          question_id: "Q1",
          question_max_total: 8,
          rubric_items: [
            { criterion: "Accuracy", explanation: "Correct concepts", max_score: 5 },
            { criterion: "Examples", explanation: "Real-world examples", max_score: 3 },
          ],
        },
      ],
      overall_feedback: "Solid structure",
    })
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/rubric-suggest",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-Token": "test-secret-token" }),
        body: expect.any(FormData),
      }),
    )
  })

  test("returns permission error when user is not an active grader in the course", async () => {
    selectQueue.push([])

    const result = await generateRubricSuggestionAction(
      {},
      createFormData({ courseId: "7", assignmentId: "10" }),
    )

    expect(result.errors?._form?.[0]).toBe(
      "You do not have permission to generate rubrics for this assessment.",
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test("returns timeout error when AI service request aborts", async () => {
    process.env.AI_RUBRIC_SUGGEST_TIMEOUT_MS = "1"
    selectQueue.push([{ id: 1 }], [{ id: 10 }])
    mockLoadJsonFromS3ObjectKey.mockResolvedValueOnce({ questions: [{ id: "Q1" }] })

    const abortError = new Error("Aborted")
    abortError.name = "AbortError"
    ;(global.fetch as unknown as jest.Mock).mockRejectedValueOnce(abortError)

    const result = await generateRubricSuggestionAction(
      {},
      createFormData({ courseId: "7", assignmentId: "10" }),
    )

    expect(result.errors?._form?.[0]).toBe("Rubric suggestion request timed out. Please try again.")
  })

  test("returns AI service error when response is non-200", async () => {
    selectQueue.push([{ id: 1 }], [{ id: 10 }])
    mockLoadJsonFromS3ObjectKey.mockResolvedValueOnce({ questions: [{ id: "Q1" }] })
    ;(global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "internal failure",
    })

    const result = await generateRubricSuggestionAction(
      {},
      createFormData({ courseId: "7", assignmentId: "10" }),
    )

    expect(result.errors?._form?.[0]).toBe("Rubric suggestion request failed (500). internal failure")
  })
})
