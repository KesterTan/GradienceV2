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
    expect(mocks.updateWhere).toHaveBeenCalled()
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

  // Group A — requireAppUser core paths

  it("does not update when user found by authProviderId and already has authProviderId set", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|existing", email: "existing@gradience.edu", name: "Existing User" },
    })

    mocks.selectQueue.push([
      {
        id: 5,
        firstName: "Existing",
        lastName: "User",
        email: "existing@gradience.edu",
        authProviderId: "auth0|existing",
      },
    ])

    const user = await requireAppUser()

    expect(mocks.update).not.toHaveBeenCalled()
    expect(user).toEqual({
      id: 5,
      firstName: "Existing",
      lastName: "User",
      email: "existing@gradience.edu",
    })
  })

  it("requireGraderUser also redirects to login when session is missing", async () => {
    mocks.getSession.mockResolvedValueOnce(null)

    await expect(requireGraderUser()).rejects.toThrow("REDIRECT:/login")
    expect(mocks.redirect).toHaveBeenCalledWith("/login")
  })

  // Group B — splitName edge cases (verified through the insert path)

  it("uses 'Account' as lastName when name is a single word", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|single", email: "alice@gradience.edu", name: "Alice" },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 10, firstName: "Alice", lastName: "Account", email: "alice@gradience.edu", authProviderId: "auth0|single" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Account" }),
    )
  })

  it("joins remaining words as lastName for multi-word names", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|multi", email: "abc@gradience.edu", name: "Alice Bob Smith" },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 11, firstName: "Alice", lastName: "Bob Smith", email: "abc@gradience.edu", authProviderId: "auth0|multi" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Bob Smith" }),
    )
  })

  it("trims extra whitespace from name before splitting", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|ws", email: "ws@gradience.edu", name: "  Alice  Bob  " },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 12, firstName: "Alice", lastName: "Bob", email: "ws@gradience.edu", authProviderId: "auth0|ws" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Bob" }),
    )
  })

  it("falls through to email prefix when name is an empty string", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|emptyname", email: "alice@gradience.edu", name: "" },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 13, firstName: "Alice", lastName: "Account", email: "alice@gradience.edu", authProviderId: "auth0|emptyname" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Account" }),
    )
  })

  it("falls through to email prefix when name is all whitespace", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|wsonly", email: "alice@gradience.edu", name: "   " },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 13, firstName: "Alice", lastName: "Account", email: "alice@gradience.edu", authProviderId: "auth0|wsonly" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Account" }),
    )
  })

  it("uses email prefix for firstName when name is null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|noname", email: "alice@gradience.edu", name: null },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 14, firstName: "Alice", lastName: "Account", email: "alice@gradience.edu", authProviderId: "auth0|noname" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Alice", lastName: "Account" }),
    )
  })

  it("uses authProviderId-based fallback email when name and email are both null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|abc", email: null, name: null },
    })

    mocks.selectQueue.push([])
    mocks.insertQueue.push([
      { id: 15, firstName: "Auth0|abc", lastName: "Account", email: "auth0|abc@auth.local", authProviderId: "auth0|abc" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "auth0|abc@auth.local" }),
    )
  })

  it("uses 'user@auth.local' fallback when sub, email, and name are all null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: null, email: null, name: null },
    })

    mocks.insertQueue.push([
      { id: 16, firstName: "User", lastName: "Account", email: "user@auth.local", authProviderId: null },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "user@auth.local", firstName: "User", lastName: "Account" }),
    )
  })

  // Group C — findUser null-input paths

  it("only queries by email when sub is null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: null, email: "found@gradience.edu", name: "Found User" },
    })

    mocks.selectQueue.push([
      { id: 20, firstName: "Found", lastName: "User", email: "found@gradience.edu", authProviderId: null },
    ])

    await requireAppUser()

    expect(mocks.select).toHaveBeenCalledTimes(1)
  })

  it("does not update when sub is null and user is found by email", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: null, email: "found@gradience.edu", name: "Found User" },
    })

    mocks.selectQueue.push([
      { id: 20, firstName: "Found", lastName: "User", email: "found@gradience.edu", authProviderId: null },
    ])

    await requireAppUser()

    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("does not update when user found by email already has a different authProviderId set", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|new", email: "linked@gradience.edu", name: "Linked User" },
    })

    // provider lookup misses, email lookup finds record with a different existing provider
    mocks.selectQueue.push(
      [],
      [{ id: 25, firstName: "Linked", lastName: "User", email: "linked@gradience.edu", authProviderId: "github|old" }],
    )

    await requireAppUser()

    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("only queries by authProviderId when email is null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|noemail", email: null, name: "No Email" },
    })

    mocks.selectQueue.push([
      { id: 21, firstName: "No", lastName: "Email", email: "auth0|noemail@auth.local", authProviderId: "auth0|noemail" },
    ])

    await requireAppUser()

    expect(mocks.select).toHaveBeenCalledTimes(1)
  })

  it("makes no SELECT queries when both sub and email are null and falls through to insert", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: null, email: null, name: null },
    })

    mocks.insertQueue.push([
      { id: 22, firstName: "User", lastName: "Account", email: "user@auth.local", authProviderId: null },
    ])

    await requireAppUser()

    expect(mocks.select).not.toHaveBeenCalled()
    expect(mocks.insert).toHaveBeenCalled()
  })

  // Group D — insert-path field values

  it("inserts with status 'active' and passwordHash 'auth0-managed'", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|fields", email: "fields@gradience.edu", name: "Fields Test" },
    })

    mocks.selectQueue.push([], [])
    mocks.insertQueue.push([
      { id: 30, firstName: "Fields", lastName: "Test", email: "fields@gradience.edu", authProviderId: "auth0|fields" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", passwordHash: "auth0-managed" }),
    )
  })

  it("inserts with authProviderId null when sub is null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: null, email: "nosub@gradience.edu", name: "No Sub" },
    })

    mocks.selectQueue.push([])
    mocks.insertQueue.push([
      { id: 31, firstName: "No", lastName: "Sub", email: "nosub@gradience.edu", authProviderId: null },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ authProviderId: null }),
    )
  })

  it("inserts with fallback email derived from sub when email is null", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|xyz", email: null, name: null },
    })

    mocks.selectQueue.push([])
    mocks.insertQueue.push([
      { id: 32, firstName: "Auth0|xyz", lastName: "Account", email: "auth0|xyz@auth.local", authProviderId: "auth0|xyz" },
    ])

    await requireAppUser()

    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ email: "auth0|xyz@auth.local" }),
    )
  })

  // Group E — return type coercions

  it("coerces id to a JS number even when the DB returns a bigint-like value", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|bigint", email: "bigint@gradience.edu", name: "Big Int" },
    })

    mocks.selectQueue.push([
      { id: "99", firstName: "Big", lastName: "Int", email: "bigint@gradience.edu", authProviderId: "auth0|bigint" },
    ])

    const user = await requireAppUser()

    expect(typeof user.id).toBe("number")
    expect(user.id).toBe(99)
  })

  it("coerces firstName, lastName, and email to strings", async () => {
    mocks.getSession.mockResolvedValueOnce({
      user: { sub: "auth0|coerce", email: "coerce@gradience.edu", name: "Coerce Test" },
    })

    mocks.selectQueue.push([
      { id: 100, firstName: 42, lastName: true, email: "coerce@gradience.edu", authProviderId: "auth0|coerce" },
    ])

    const user = await requireAppUser()

    expect(typeof user.firstName).toBe("string")
    expect(typeof user.lastName).toBe("string")
    expect(typeof user.email).toBe("string")
  })
})
