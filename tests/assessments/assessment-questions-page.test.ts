import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import React from "react"

const mocks = vi.hoisted(() => ({
  requireAppUser: vi.fn(),
  getAssessmentQuestionsForMember: vi.fn(),
  parseQuestionsJson: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
  QuestionEditor: vi.fn(),
}))

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/lib/course-management", () => ({
  getAssessmentQuestionsForMember: mocks.getAssessmentQuestionsForMember,
}))
vi.mock("@/lib/questions", () => ({ parseQuestionsJson: mocks.parseQuestionsJson }))
vi.mock(
  "@/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor",
  () => ({ QuestionEditor: mocks.QuestionEditor }),
)

import AssessmentQuestionsPage from "@/app/courses/[courseId]/assessments/[assignmentId]/questions/page"

function makeAssessment(overrides?: Record<string, unknown>) {
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
    maxAttemptResubmission: 0,
    viewerRole: "Student" as "Student" | "Instructor",
    ...overrides,
  }
}

function makeQuestionsPayload() {
  return {
    assignment_title: "Midterm",
    course: "CS101",
    instructions_summary: "",
    questions: [
      { question_id: "Q1", question_text: "Describe X", question_max_total: 10, is_extra_credit: false },
    ],
  }
}

describe("AssessmentQuestionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAppUser.mockResolvedValue({
      id: 42,
      firstName: "Stu",
      lastName: "Dent",
      email: "stu@example.edu",
    })
    mocks.QuestionEditor.mockReturnValue(null)
    mocks.parseQuestionsJson.mockReturnValue(null)
  })

  // ── auth / ID validation ──────────────────────────────────────────────────

  it("calls notFound when assessment is not found (non-member)", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(null)
    await expect(
      AssessmentQuestionsPage({ params: Promise.resolve({ courseId: "5", assignmentId: "12" }) }),
    ).rejects.toThrow("NOT_FOUND")
    expect(mocks.notFound).toHaveBeenCalledTimes(1)
  })

  it("calls notFound for a non-numeric courseId without querying the DB", async () => {
    await expect(
      AssessmentQuestionsPage({ params: Promise.resolve({ courseId: "abc", assignmentId: "12" }) }),
    ).rejects.toThrow("NOT_FOUND")
    expect(mocks.getAssessmentQuestionsForMember).not.toHaveBeenCalled()
  })

  it("calls notFound for a non-numeric assignmentId without querying the DB", async () => {
    await expect(
      AssessmentQuestionsPage({ params: Promise.resolve({ courseId: "5", assignmentId: "xyz" }) }),
    ).rejects.toThrow("NOT_FOUND")
    expect(mocks.getAssessmentQuestionsForMember).not.toHaveBeenCalled()
  })

  // ── DB query arguments ────────────────────────────────────────────────────

  it("queries with the authenticated user's id and parsed integer ids", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(makeAssessment())
    await AssessmentQuestionsPage({ params: Promise.resolve({ courseId: "5", assignmentId: "12" }) })
    expect(mocks.getAssessmentQuestionsForMember).toHaveBeenCalledWith(42, 5, 12)
  })

  it("passes questionsJson from the assessment to parseQuestionsJson", async () => {
    const questionsJson = { assignment_title: "T", course: "C", instructions_summary: "", questions: [] }
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(makeAssessment({ questionsJson }))
    await AssessmentQuestionsPage({ params: Promise.resolve({ courseId: "5", assignmentId: "12" }) })
    expect(mocks.parseQuestionsJson).toHaveBeenCalledWith(questionsJson)
  })

  // ── student view — null questions ─────────────────────────────────────────

  it("renders 'No questions yet' and omits QuestionEditor when student has no saved questions", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(makeAssessment({ viewerRole: "Student" }))
    mocks.parseQuestionsJson.mockReturnValue(null)

    const element = await AssessmentQuestionsPage({
      params: Promise.resolve({ courseId: "5", assignmentId: "12" }),
    })
    const html = renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(html).toContain("No questions yet")
    expect(mocks.QuestionEditor).not.toHaveBeenCalled()
  })

  // ── student view — questions present ──────────────────────────────────────

  it("passes canEdit=false to QuestionEditor for a student viewer", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(makeAssessment({ viewerRole: "Student" }))
    mocks.parseQuestionsJson.mockReturnValue(makeQuestionsPayload())

    const element = await AssessmentQuestionsPage({
      params: Promise.resolve({ courseId: "5", assignmentId: "12" }),
    })
    renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(mocks.QuestionEditor.mock.calls[0][0]).toMatchObject({ canEdit: false })
  })

  it("passes initialPayload from parseQuestionsJson to QuestionEditor", async () => {
    const payload = makeQuestionsPayload()
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(makeAssessment({ viewerRole: "Student" }))
    mocks.parseQuestionsJson.mockReturnValue(payload)

    const element = await AssessmentQuestionsPage({
      params: Promise.resolve({ courseId: "5", assignmentId: "12" }),
    })
    renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(mocks.QuestionEditor.mock.calls[0][0]).toMatchObject({ initialPayload: payload })
  })

  // ── instructor view ───────────────────────────────────────────────────────

  it("passes canEdit=true to QuestionEditor for an instructor viewer", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(
      makeAssessment({ viewerRole: "Instructor" }),
    )
    mocks.parseQuestionsJson.mockReturnValue(makeQuestionsPayload())

    const element = await AssessmentQuestionsPage({
      params: Promise.resolve({ courseId: "5", assignmentId: "12" }),
    })
    renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(mocks.QuestionEditor.mock.calls[0][0]).toMatchObject({ canEdit: true })
  })

  it("renders QuestionEditor even when instructor has null questions (edit mode)", async () => {
    mocks.getAssessmentQuestionsForMember.mockResolvedValue(
      makeAssessment({ viewerRole: "Instructor" }),
    )
    mocks.parseQuestionsJson.mockReturnValue(null)

    const element = await AssessmentQuestionsPage({
      params: Promise.resolve({ courseId: "5", assignmentId: "12" }),
    })
    renderToStaticMarkup(element as unknown as React.ReactElement)

    expect(mocks.QuestionEditor).toHaveBeenCalled()
    expect(mocks.QuestionEditor.mock.calls[0][0]).toMatchObject({ canEdit: true })
  })
})
