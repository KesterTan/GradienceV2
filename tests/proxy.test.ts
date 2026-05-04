import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const mocks = vi.hoisted(() => ({
  createAuth0Client: vi.fn(),
  middleware: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/auth0", () => ({
  createAuth0Client: mocks.createAuth0Client,
}))

import { proxy } from "@/proxy"

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.middleware.mockResolvedValue(NextResponse.next())
    mocks.getSession.mockResolvedValue(null)
    mocks.createAuth0Client.mockReturnValue({
      middleware: mocks.middleware,
      getSession: mocks.getSession,
    })
  })

  it("preserves the requested path when redirecting an unauthenticated user to login", async () => {
    const request = new NextRequest("https://gradience-v1.vercel.app/courses/some-id?tab=students")

    const response = await proxy(request)

    expect(response.headers.get("location")).toBe(
      "https://gradience-v1.vercel.app/login?returnTo=%2Fcourses%2Fsome-id%3Ftab%3Dstudents",
    )
  })

  it("allows the login page through without invoking auth middleware", async () => {
    const request = new NextRequest("https://gradience-v1.vercel.app/login?returnTo=%2Fcourses%2Fsome-id")

    const response = await proxy(request)

    expect(response.status).toBe(200)
    expect(mocks.middleware).not.toHaveBeenCalled()
    expect(mocks.getSession).not.toHaveBeenCalled()
  })
})
