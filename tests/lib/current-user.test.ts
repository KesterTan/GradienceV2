import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  query: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/db/db", () => ({ query: mocks.query }))
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: mocks.getSession } }))

import { requireAppUser, requireGraderUser } from "@/lib/current-user"

describe("current-user helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to login when session is missing", async () => {
    mocks.getSession.mockResolvedValueOnce(null)

    await expect(requireAppUser()).rejects.toThrow("REDIRECT:/login")
    expect(mocks.redirect).toHaveBeenCalledWith("/login")
  })

  it("updates missing auth_provider_id for existing email-matched user", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|abc", email: "irene@gradience.edu", name: "Irene Instructor" },
    })

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            first_name: "Irene",
            last_name: "Instructor",
            email: "irene@gradience.edu",
            global_role: "grader",
            auth_provider_id: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })

    const user = await requireAppUser()

    expect(mocks.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE gradience.users"), ["auth0|abc", 1])
    expect(user).toEqual({
      id: 1,
      firstName: "Irene",
      lastName: "Instructor",
      email: "irene@gradience.edu",
      globalRole: "grader",
    })
  })

  it("inserts a new user when no record exists", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|new", email: "new@gradience.edu", name: "New User" },
    })

    mocks.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            first_name: "New",
            last_name: "User",
            email: "new@gradience.edu",
            global_role: "grader",
            auth_provider_id: "auth0|new",
          },
        ],
      })

    const user = await requireAppUser()

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO gradience.users"),
      ["New", "User", "new@gradience.edu", "auth0-managed", "auth0|new"],
    )
    expect(user.id).toBe(9)
  })

  it("rejects non-grader users", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|stu", email: "stu@gradience.edu", name: "Stu Student" },
    })

    mocks.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            first_name: "Stu",
            last_name: "Student",
            email: "stu@gradience.edu",
            global_role: "student",
            auth_provider_id: "auth0|stu",
          },
        ],
      })

    await expect(requireGraderUser()).rejects.toThrow("REDIRECT:/login?error=unauthorized")
    expect(mocks.redirect).toHaveBeenCalledWith("/login?error=unauthorized")
  })
})
