import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  requireAppUser: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  transaction: vi.fn(),
  txUpdateSet: vi.fn(),
  txUpdateWhere: vi.fn(),
  txDeleteWhere: vi.fn(),
  txInsertValues: vi.fn(),
  selectQueue: [] as unknown[][],
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
  },
}))

import { updateRubricAction } from "@/app/courses/[courseId]/assessments/[assignmentId]/rubric/actions"

describe("updateRubricAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0

    mocks.requireAppUser.mockResolvedValue({ id: 42 })
    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }),
    }))

    mocks.txUpdateWhere.mockResolvedValue(undefined)
    mocks.txUpdateSet.mockReturnValue({ where: mocks.txUpdateWhere })
    mocks.txDeleteWhere.mockResolvedValue(undefined)
    mocks.txInsertValues.mockResolvedValue(undefined)

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
      const tx = {
        update: () => ({
          set: mocks.txUpdateSet,
        }),
        delete: () => ({
          where: mocks.txDeleteWhere,
        }),
        insert: () => ({
          values: mocks.txInsertValues,
        }),
      }

      return callback(tx)
    })
  })

  it("derives and saves assignment total points from the rubric sum", async () => {
    mocks.selectQueue.push(
      [{ id: 91 }],
      [{ id: 12, totalPoints: 10 }],
    )

    const formData = new FormData()
    formData.set("courseId", "5")
    formData.set("assignmentId", "12")
    formData.set(
      "rubricPayload",
      JSON.stringify({
        questions: [
          {
            question_id: "Q1",
            question_name: "Short answer",
            rubric_items: [
              { criterion: "Correctness", rubric_name: "Correctness", max_score: 4 },
              { criterion: "Clarity", rubric_name: "Clarity", max_score: 4 },
            ],
          },
        ],
      }),
    )

    const state = await updateRubricAction({}, formData)

    expect(state.errors).toBeUndefined()
    expect(mocks.transaction).toHaveBeenCalled()
    expect(mocks.txUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        totalPoints: 8,
      }),
    )
  })
})
