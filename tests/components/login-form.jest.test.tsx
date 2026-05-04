/**
 * @jest-environment jsdom
 */
import React from "react"
import { render, screen } from "@testing-library/react"
import { LoginForm } from "@/components/login-form"

describe("LoginForm", () => {
  it("uses the provided returnTo path for both Auth0 links", () => {
    render(<LoginForm returnTo="/courses/some-id?tab=students" />)

    expect(screen.getByRole("link", { name: /continue with email/i })).toHaveAttribute(
      "href",
      "/api/auth/login?connection=Gradience&returnTo=%2Fcourses%2Fsome-id%3Ftab%3Dstudents",
    )
    expect(screen.getByRole("link", { name: /continue with google/i })).toHaveAttribute(
      "href",
      "/api/auth/login?connection=google-oauth2&returnTo=%2Fcourses%2Fsome-id%3Ftab%3Dstudents",
    )
  })

  it("falls back to /courses when returnTo is unsafe", () => {
    render(<LoginForm returnTo="https://example.com/courses/some-id" />)

    expect(screen.getByRole("link", { name: /continue with email/i })).toHaveAttribute(
      "href",
      "/api/auth/login?connection=Gradience&returnTo=%2Fcourses",
    )
  })
})
