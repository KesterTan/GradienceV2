import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  requireAppUser: vi.fn(),
  createRegradeRequest: vi.fn(),
  getExistingRegradeRequest: vi.fn(),
  resolveRegradeRequest: vi.fn(),
  revalidatePath: vi.fn(),
  selectQueue: [] as unknown[][],
  select: vi.fn(),
  selectLimit: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/current-user", () => ({ requireAppUser: mocks.requireAppUser }))
vi.mock("@/lib/course-management", () => ({
  createRegradeRequest: mocks.createRegradeRequest,
  getExistingRegradeRequest: mocks.getExistingRegradeRequest,
  resolveRegradeRequest: mocks.resolveRegradeRequest,
}))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
  },
}))

import { POST, PATCH } from "@/app/api/courses/[courseId]/assessments/[assignmentId]/submissions/[submissionId]/regrade/route"

const BASE_PARAMS = { courseId: "1", assignmentId: "2", submissionId: "3" }

function makeRequest(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/regrade", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeContext(params = BASE_PARAMS) {
  return { params }
}

describe("POST /regrade (student submits request)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0
    mocks.requireAppUser.mockResolvedValue({ id: 10 })

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => {
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: () => chain,
        limit: mocks.selectLimit,
      }
      return chain
    })
  })

  it("returns 400 when reason is empty", async () => {
    const res = await POST(makeRequest("POST", { reason: "  " }), makeContext())
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/reason/i)
  })

  it("returns 403 when user is not a student member", async () => {
    mocks.selectQueue.push([]) // no student membership
    const res = await POST(makeRequest("POST", { reason: "I think my answer was correct." }), makeContext())
    expect(res.status).toBe(403)
  })

  it("returns 404 when submission not found or not owned by student", async () => {
    mocks.selectQueue.push([{ id: 99 }]) // student membership
    mocks.selectQueue.push([]) // submission not found
    const res = await POST(makeRequest("POST", { reason: "I think my answer was correct." }), makeContext())
    expect(res.status).toBe(404)
  })

  it("returns 403 when grade is not released", async () => {
    mocks.selectQueue.push([{ id: 99 }]) // student membership
    mocks.selectQueue.push([{ id: 3, studentMembershipId: 99 }]) // submission owned by student
    mocks.selectQueue.push([{ id: 55, isReleasedToStudent: false }]) // grade not released
    const res = await POST(makeRequest("POST", { reason: "I think my answer was correct." }), makeContext())
    expect(res.status).toBe(403)
  })

  it("returns 409 when a pending regrade request already exists", async () => {
    mocks.selectQueue.push([{ id: 99 }]) // student membership
    mocks.selectQueue.push([{ id: 3, studentMembershipId: 99 }]) // submission
    mocks.selectQueue.push([{ id: 55, isReleasedToStudent: true }]) // grade released
    mocks.getExistingRegradeRequest.mockResolvedValue({ id: 7, status: "pending" })
    const res = await POST(makeRequest("POST", { reason: "I think my answer was correct." }), makeContext())
    expect(res.status).toBe(409)
  })

  it("returns 201 on success", async () => {
    mocks.selectQueue.push([{ id: 99 }]) // student membership
    mocks.selectQueue.push([{ id: 3, studentMembershipId: 99 }]) // submission
    mocks.selectQueue.push([{ id: 55, isReleasedToStudent: true }]) // grade released
    mocks.getExistingRegradeRequest.mockResolvedValue(null)
    mocks.createRegradeRequest.mockResolvedValue({ id: 1, status: "pending" })
    const res = await POST(makeRequest("POST", { reason: "I think my answer was correct." }), makeContext())
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mocks.createRegradeRequest).toHaveBeenCalledWith(99, 3, "I think my answer was correct.")
  })
})

describe("PATCH /regrade (instructor resolves)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.selectQueue.length = 0
    mocks.requireAppUser.mockResolvedValue({ id: 20 })

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => {
      const chain = {
        from: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        where: () => chain,
        limit: mocks.selectLimit,
      }
      return chain
    })
  })

  const validBody = {
    regradeRequestId: 7,
    scores: [{ order: 0, pointsAwarded: 5, comment: null }],
    overallFeedback: null,
  }

  it("returns 403 when caller is not a grader", async () => {
    mocks.selectQueue.push([]) // no grader membership
    const res = await PATCH(makeRequest("PATCH", validBody), makeContext())
    expect(res.status).toBe(403)
  })

  it("returns 404 when regrade request not found", async () => {
    mocks.selectQueue.push([{ id: 88 }]) // grader membership
    mocks.selectQueue.push([]) // regrade request not found
    const res = await PATCH(makeRequest("PATCH", validBody), makeContext())
    expect(res.status).toBe(404)
  })

  it("returns 409 when regrade request is already resolved", async () => {
    mocks.selectQueue.push([{ id: 88 }]) // grader membership
    mocks.selectQueue.push([{ id: 7, status: "resolved" }]) // already resolved
    const res = await PATCH(makeRequest("PATCH", validBody), makeContext())
    expect(res.status).toBe(409)
  })

  it("returns 200 on success", async () => {
    mocks.selectQueue.push([{ id: 88 }]) // grader membership
    mocks.selectQueue.push([{ id: 7, status: "pending" }]) // pending request
    mocks.resolveRegradeRequest.mockResolvedValue(undefined)
    const res = await PATCH(makeRequest("PATCH", validBody), makeContext())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(mocks.resolveRegradeRequest).toHaveBeenCalledWith(
      7, 88, 3, 2,
      [{ order: 0, pointsAwarded: 5, comment: null }],
      null,
    )
  })
})
