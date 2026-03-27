import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAppUser: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  transaction: vi.fn(),
  rootSelectQueue: [] as unknown[][],
  txSelectQueue: [] as unknown[][],
  txInsertValues: vi.fn(),
  txInsertReturning: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
  txDeleteWhere: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}))

import { saveSubmissionGradeAction } from "@/app/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/actions"

function createGradeFormData(params?: { scoresPayload?: unknown; overallFeedback?: string }) {
  const formData = new FormData()
  formData.set("courseId", "7")
  formData.set("assignmentId", "11")
  formData.set("submissionId", "19")
  formData.set(
    "scoresPayload",
    JSON.stringify(
      params?.scoresPayload ?? [
        { order: 0, pointsAwarded: 4 },
        { order: 1, pointsAwarded: 5 },
      ],
    ),
  )
  if (params?.overallFeedback !== undefined) {
    formData.set("overallFeedback", params.overallFeedback)
  }
  return formData
}

describe("saveSubmissionGradeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rootSelectQueue.length = 0
    mocks.txSelectQueue.length = 0

    mocks.requireAppUser.mockResolvedValue({ id: 42 })

    mocks.selectLimit.mockImplementation(async () => (mocks.rootSelectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => {
      const chain = {
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }

      return {
        from: () => chain,
      }
    })

    mocks.txInsertReturning.mockResolvedValue([{ id: 555 }])
    mocks.txInsertValues.mockReturnValue({
      returning: mocks.txInsertReturning,
    })
    mocks.txUpdateWhere.mockResolvedValue(undefined)
    mocks.txUpdateSet.mockReturnValue({ where: mocks.txUpdateWhere })
    mocks.txDeleteWhere.mockResolvedValue(undefined)

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: async () => (mocks.txSelectQueue.shift() ?? []) as unknown[],
              limit: async () => (mocks.txSelectQueue.shift() ?? []) as unknown[],
            }),
          }),
        }),
        insert: (...args: unknown[]) => ({
          values: (...innerArgs: unknown[]) => {
            mocks.txInsertValues(...args, ...innerArgs)
            return { returning: mocks.txInsertReturning }
          },
        }),
        update: () => ({
          set: (...args: unknown[]) => {
            mocks.txUpdateSet(...args)
            return { where: mocks.txUpdateWhere }
          },
        }),
        delete: () => ({
          where: mocks.txDeleteWhere,
        }),
      }

      return callback(tx)
    })
  })

  it("denies grading when the user is not an instructor", async () => {
    mocks.rootSelectQueue.push([])

    const state = await saveSubmissionGradeAction({}, createGradeFormData())

    expect(state.errors?._form?.[0]).toBe("Only instructors can grade submissions.")
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("creates a new grade and rubric scores for a submission", async () => {
    mocks.rootSelectQueue.push(
      [{ id: 88 }],
      [
        {
          id: 11,
          totalPoints: 10,
          submissionId: 19,
          rubricJson: {
            questions: [
              {
                question_id: "Q1",
                question_name: "Prompt",
                rubric_items: [
                  { criterion: "Correctness", rubric_name: "Correctness", max_score: 5 },
                  { criterion: "Explanation", rubric_name: "Explanation", max_score: 5 },
                ],
              },
            ],
          },
        },
      ],
    )
    mocks.txSelectQueue.push(
      [],
      [
        { id: 101, displayOrder: 1 },
        { id: 102, displayOrder: 2 },
      ],
      [],
    )

    const state = await saveSubmissionGradeAction(
      {},
      createGradeFormData({ overallFeedback: "Nice work overall." }),
    )

    expect(state.message).toBe("Grades saved.")
    expect(mocks.txInsertValues).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        submissionId: 19,
        gradedByMembershipId: 88,
        totalScore: 9,
        overallFeedback: "Nice work overall.",
      }),
    )
    expect(mocks.txInsertValues).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      [
        expect.objectContaining({ gradeId: 555, rubricItemId: 101, pointsAwarded: 4 }),
        expect.objectContaining({ gradeId: 555, rubricItemId: 102, pointsAwarded: 5 }),
      ],
    )
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/courses/7/assessments/11/submissions/19")
  })

  it("updates an existing saved grade", async () => {
    mocks.rootSelectQueue.push(
      [{ id: 88 }],
      [
        {
          id: 11,
          totalPoints: 5,
          submissionId: 19,
          rubricJson: {
            questions: [
              {
                question_id: "Q1",
                question_name: "Prompt",
                rubric_items: [{ criterion: "Correctness", rubric_name: "Correctness", max_score: 5 }],
              },
            ],
          },
        },
      ],
    )
    mocks.txSelectQueue.push(
      [{ id: 201, displayOrder: 1 }],
      [{ id: 700 }],
    )

    const state = await saveSubmissionGradeAction(
      {},
      createGradeFormData({
        scoresPayload: [{ order: 0, pointsAwarded: 3 }],
        overallFeedback: "Revised after review.",
      }),
    )

    expect(state.message).toBe("Grades saved.")
    expect(mocks.txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        gradedByMembershipId: 88,
        totalScore: 3,
        overallFeedback: "Revised after review.",
      }),
    )
    expect(mocks.txDeleteWhere).toHaveBeenCalled()
  })
})
