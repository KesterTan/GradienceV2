import { describe, expect, it, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  selectLimit: vi.fn(),
  select: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
  },
}))

import { getAssessmentQuestionsForMember } from "@/lib/course-management"

function makeSelectChain() {
  const chain: Record<string, () => unknown> = {}
  chain.from = () => chain
  chain.innerJoin = () => chain
  chain.where = () => ({ limit: mocks.selectLimit })
  return { from: () => chain }
}

function makeAssessmentRow(overrides?: Record<string, unknown>) {
  return {
    id: 12,
    title: "Midterm",
    description: "Intro exam",
    releaseAt: "2026-03-01T00:00:00Z",
    dueAt: "2026-03-10T00:00:00Z",
    lateUntil: null,
    totalPoints: 100,
    courseId: 5,
    courseTitle: "CS101",
    questionsJson: null,
    allowResubmissions: false,
    maxAttemptResubmission: null,
    viewerRole: "Student",
    ...overrides,
  }
}

describe("getAssessmentQuestionsForMember", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0

    mocks.selectLimit.mockImplementation(
      async () => (mocks.selectQueue.shift() ?? []) as unknown[],
    )
    mocks.select.mockImplementation(makeSelectChain)
  })

  it("returns null when user has no active membership in the course", async () => {
    mocks.selectQueue.push([])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result).toBeNull()
  })

  it("returns assessment with viewerRole='Student' for a student member", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ viewerRole: "Student" })])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result).not.toBeNull()
    expect(result?.viewerRole).toBe("Student")
  })

  it("returns assessment with viewerRole='Instructor' for an instructor/grader member", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ viewerRole: "Instructor" })])
    const result = await getAssessmentQuestionsForMember(1, 5, 12)
    expect(result?.viewerRole).toBe("Instructor")
  })

  it("normalizes any non-Student viewerRole value to 'Instructor'", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ viewerRole: "grader" })])
    const result = await getAssessmentQuestionsForMember(1, 5, 12)
    expect(result?.viewerRole).toBe("Instructor")
  })

  it("returns null questionsJson when the assignment has no questions saved yet", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ questionsJson: null, viewerRole: "Student" })])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result?.questionsJson).toBeNull()
  })

  it("returns the questionsJson payload when questions have been saved", async () => {
    const questionsJson = {
      assignment_title: "Midterm",
      course: "CS101",
      instructions_summary: "",
      questions: [{ question_id: "Q1", question_text: "Explain X", question_max_total: 10 }],
    }
    mocks.selectQueue.push([makeAssessmentRow({ questionsJson, viewerRole: "Student" })])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result?.questionsJson).toEqual(questionsJson)
  })

  it("maps all scalar fields correctly from the DB row", async () => {
    mocks.selectQueue.push([
      makeAssessmentRow({
        id: 7,
        title: "Quiz",
        description: "Short quiz",
        totalPoints: 50,
        courseId: 3,
        courseTitle: "Math 101",
        allowResubmissions: true,
        maxAttemptResubmission: 2,
        lateUntil: "2026-03-12T00:00:00Z",
        viewerRole: "Student",
      }),
    ])
    const result = await getAssessmentQuestionsForMember(42, 3, 7)
    expect(result?.id).toBe(7)
    expect(result?.title).toBe("Quiz")
    expect(result?.description).toBe("Short quiz")
    expect(result?.totalPoints).toBe(50)
    expect(result?.courseId).toBe(3)
    expect(result?.courseTitle).toBe("Math 101")
    expect(result?.allowResubmissions).toBe(true)
    expect(result?.maxAttemptResubmission).toBe(2)
    expect(result?.lateUntil).toBe("2026-03-12T00:00:00Z")
  })

  it("returns null description when the DB row has a null description", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ description: null })])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result?.description).toBeNull()
  })

  it("returns null lateUntil when the DB row has no late deadline", async () => {
    mocks.selectQueue.push([makeAssessmentRow({ lateUntil: null })])
    const result = await getAssessmentQuestionsForMember(42, 5, 12)
    expect(result?.lateUntil).toBeNull()
  })
})
