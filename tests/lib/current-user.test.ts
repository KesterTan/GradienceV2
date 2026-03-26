import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
  getSession: vi.fn(),
  select: vi.fn(),
  selectLimit: vi.fn(),
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  insert: vi.fn(),
  insertValues: vi.fn(),
  insertReturning: vi.fn(),
  selectQueue: [] as unknown[][],
  insertQueue: [] as unknown[][],
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/lib/auth0", () => ({ auth0: { getSession: mocks.getSession } }))
vi.mock("@/db/orm", () => ({
  db: {
    select: mocks.select,
    update: mocks.update,
    insert: mocks.insert,
  },
}))

import { requireAppUser, requireGraderUser } from "@/lib/current-user"

describe("current-user helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.selectQueue.length = 0
    mocks.insertQueue.length = 0

    mocks.selectLimit.mockImplementation(async () => (mocks.selectQueue.shift() ?? []) as unknown[])
    mocks.select.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }),
    }))

    mocks.updateWhere.mockResolvedValue(undefined)
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere })
    mocks.update.mockReturnValue({ set: mocks.updateSet })

    mocks.insertReturning.mockImplementation(async () => (mocks.insertQueue.shift() ?? []) as unknown[])
    mocks.insertValues.mockReturnValue({ returning: mocks.insertReturning })
    mocks.insert.mockReturnValue({ values: mocks.insertValues })
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

    mocks.selectQueue.push(
      [],
      [
        {
          id: 1,
          firstName: "Irene",
          lastName: "Instructor",
          email: "irene@gradience.edu",
          authProviderId: null,
        },
      ],
    )

    const user = await requireAppUser()

    expect(mocks.updateSet).toHaveBeenCalledWith({ authProviderId: "auth0|abc", status: "active" })
    expect(user).toEqual({
      id: 1,
      firstName: "Irene",
      lastName: "Instructor",
      email: "irene@gradience.edu",
    })
  })

  it("inserts a new user when no record exists", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|new", email: "new@gradience.edu", name: "New User" },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      {
        id: 9,
        firstName: "New",
        lastName: "User",
        email: "new@gradience.edu",
        authProviderId: "auth0|new",
      },
    ])

    const user = await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: "New",
        lastName: "User",
        email: "new@gradience.edu",
        passwordHash: "auth0-managed",
        authProviderId: "auth0|new",
      }),
    )
    expect(user.id).toBe(9)
  })

  it("requireGraderUser returns the authenticated user", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|stu", email: "stu@gradience.edu", name: "Stu Student" },
    })

    mocks.selectQueue.push([
      {
        id: 2,
        firstName: "Stu",
        lastName: "Student",
        email: "stu@gradience.edu",
        authProviderId: "auth0|stu",
      },
    ])

    await expect(requireGraderUser()).resolves.toEqual({
      id: 2,
      firstName: "Stu",
      lastName: "Student",
      email: "stu@gradience.edu",
    })
  })
})
