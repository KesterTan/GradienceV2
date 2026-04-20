import { describe, expect, it } from "vitest"
import { questionsPayloadSchema, parseQuestionsJson } from "@/lib/questions"

// ── questionsPayloadSchema ────────────────────────────────────────────────

describe("questionsPayloadSchema", () => {
  const validPayload = {
    assignment_title: "Midterm 1",
    course: "Intro CS",
    instructions_summary: "Answer all questions",
    questions: [
      { question_id: "Q1", question_text: "What is 2+2?", question_max_total: 10 },
    ],
  }

  it("accepts a fully valid payload", () => {
    const result = questionsPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it("accepts is_extra_credit: true", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], is_extra_credit: true }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.questions[0].is_extra_credit).toBe(true)
    }
  })

  it("accepts is_extra_credit: false", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], is_extra_credit: false }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("accepts a question without is_extra_credit (optional field)", () => {
    const result = questionsPayloadSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.questions[0].is_extra_credit).toBeUndefined()
    }
  })

  it("rejects an empty question_text", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], question_text: "" }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      const key = result.error.issues[0].path.join(".")
      expect(key).toBe("questions.0.question_text")
      expect(result.error.issues[0].message).toBe("Question text is required")
    }
  })

  it("rejects a whitespace-only question_text", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], question_text: "   " }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      const key = result.error.issues[0].path.join(".")
      expect(key).toBe("questions.0.question_text")
    }
  })

  it("rejects an empty question_id", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], question_id: "" }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      const key = result.error.issues[0].path.join(".")
      expect(key).toBe("questions.0.question_id")
      expect(result.error.issues[0].message).toBe("Question ID is required")
    }
  })

  it("rejects a negative question_max_total", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], question_max_total: -1 }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      const key = result.error.issues[0].path.join(".")
      expect(key).toBe("questions.0.question_max_total")
    }
  })

  it("accepts question_max_total of 0", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], question_max_total: 0 }],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it("rejects an empty questions array", () => {
    const payload = { ...validPayload, questions: [] }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one question is required")
    }
  })

  it("accepts multiple questions", () => {
    const payload = {
      ...validPayload,
      questions: [
        { question_id: "Q1", question_text: "First", question_max_total: 5 },
        { question_id: "Q2", question_text: "Second", question_max_total: 5, is_extra_credit: true },
      ],
    }
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.questions).toHaveLength(2)
      expect(result.data.questions[1].is_extra_credit).toBe(true)
    }
  })

  it("rejects missing assignment_title", () => {
    const { assignment_title, ...payload } = validPayload
    const result = questionsPayloadSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })
})

// ── parseQuestionsJson ────────────────────────────────────────────────────

describe("parseQuestionsJson", () => {
  const validPayload = {
    assignment_title: "Midterm",
    course: "CS101",
    instructions_summary: "",
    questions: [
      { question_id: "Q1", question_text: "Describe X", question_max_total: 10 },
    ],
  }

  it("returns null for null input", () => {
    expect(parseQuestionsJson(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(parseQuestionsJson(undefined)).toBeNull()
  })

  it("returns null for an invalid JSON string", () => {
    expect(parseQuestionsJson("not json {{{")).toBeNull()
  })

  it("returns null for a valid JSON string that fails schema", () => {
    expect(parseQuestionsJson(JSON.stringify({ questions: [] }))).toBeNull()
  })

  it("returns null for an object that fails schema validation", () => {
    expect(parseQuestionsJson({ questions: [] })).toBeNull()
  })

  it("parses a valid plain object", () => {
    const result = parseQuestionsJson(validPayload)
    expect(result).not.toBeNull()
    expect(result?.assignment_title).toBe("Midterm")
    expect(result?.questions).toHaveLength(1)
    expect(result?.questions[0].question_id).toBe("Q1")
  })

  it("parses a valid JSON string", () => {
    const result = parseQuestionsJson(JSON.stringify(validPayload))
    expect(result).not.toBeNull()
    expect(result?.questions[0].question_text).toBe("Describe X")
  })

  it("preserves is_extra_credit when parsing", () => {
    const payload = {
      ...validPayload,
      questions: [{ ...validPayload.questions[0], is_extra_credit: true }],
    }
    const result = parseQuestionsJson(payload)
    expect(result?.questions[0].is_extra_credit).toBe(true)
  })

  it("returns null for a number input", () => {
    expect(parseQuestionsJson(42)).toBeNull()
  })
})
