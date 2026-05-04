import { describe, expect, it } from "vitest"
import { getSafeReturnTo } from "@/lib/auth-return-to"

describe("getSafeReturnTo", () => {
  it("falls back to /courses when returnTo is missing", () => {
    expect(getSafeReturnTo(undefined)).toBe("/courses")
  })

  it("preserves relative app paths with query strings", () => {
    expect(getSafeReturnTo("/courses/some-id?tab=students")).toBe("/courses/some-id?tab=students")
  })

  it("accepts same-origin absolute URLs when an origin is provided", () => {
    expect(
      getSafeReturnTo("https://gradience-v1.vercel.app/courses/some-id?tab=students", {
        origin: "https://gradience-v1.vercel.app",
      }),
    ).toBe("/courses/some-id?tab=students")
  })

  it("rejects external URLs and protocol-relative paths", () => {
    expect(
      getSafeReturnTo("https://example.com/courses/some-id", {
        origin: "https://gradience-v1.vercel.app",
      }),
    ).toBe("/courses")
    expect(getSafeReturnTo("//example.com/courses/some-id")).toBe("/courses")
  })
})
