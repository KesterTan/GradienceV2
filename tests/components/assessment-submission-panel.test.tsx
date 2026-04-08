/**
 * @jest-environment jsdom
 */
import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { MemberSubmissionHistoryItem } from "@/lib/course-management"

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
  MockLink.displayName = "MockLink"
  return MockLink
})

// Stable date format so tests aren't coupled to locale/timezone
jest.mock("date-fns", () => ({
  format: (_date: Date, _fmt: string) => "Jan 1, 2026 at 12:00 PM",
}))

import { AssessmentSubmissionPanel } from "@/components/assessment-submission-panel"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FUTURE = "2099-12-31T23:59:59.000Z"
const PAST   = "2000-01-01T00:00:00.000Z"

function makeItem(
  overrides: Partial<MemberSubmissionHistoryItem> = {},
): MemberSubmissionHistoryItem {
  return {
    id: 1,
    attemptNumber: 1,
    status: "submitted",
    submittedAt: "2026-01-01T12:00:00.000Z",
    fileUrl: "/uploads/hw1.pdf",
    isCurrent: true,
    ...overrides,
  }
}

const defaultProps = {
  courseId: 1,
  assignmentId: 2,
  assignmentTitle: "Homework 1",
  dueAt: FUTURE,
  totalPoints: 100,
  allowResubmissions: true,
  maxAttemptResubmission: 3,
  history: [] as MemberSubmissionHistoryItem[],
}

function makeFetchOk(body: object = { success: true }) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  })
}

function makeFetchError(body: object) {
  return jest.fn().mockResolvedValue({
    ok: false,
    json: () => Promise.resolve(body),
  })
}

function makePdfFile(name = "submission.pdf", sizeBytes = 1024) {
  return new File(["x".repeat(sizeBytes)], name, { type: "application/pdf" })
}

/**
 * Simulates a file being selected via the hidden file input.
 * Uses fireEvent.change + direct files property injection to bypass jsdom's
 * accept-attribute filtering (which would silently drop non-PDF files).
 */
function simulateFileSelect(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, "files", {
    value: {
      0: file,
      length: 1,
      item: (i: number) => (i === 0 ? file : null),
    },
    configurable: true,
  })
  fireEvent.change(input)
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn() as jest.Mock
})

// ── 1. Eligibility logic ────────────────────────────────────────────────────

describe("Eligibility logic", () => {
  it("shows deadline-passed banner and disables upload when past due date", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} />)

    expect(
      screen.getByText(/deadline for this assignment has passed/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/submit before/i)).not.toBeInTheDocument()

    expect(
      screen.getByRole("button", { name: /submit assignment/i }),
    ).toBeDisabled()
  })

  it("shows attempt-limit banner when submissions are at cap (allowResubmissions: false)", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={FUTURE}
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[makeItem()]}
      />,
    )

    expect(
      screen.getByText(/you have used all 1 submission attempt/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /submit assignment/i }),
    ).toBeDisabled()
  })

  it("shows attempt-limit banner with correct plural count (allowResubmissions: true, 3 attempts)", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={FUTURE}
        allowResubmissions={true}
        maxAttemptResubmission={3}
        history={[
          makeItem({ id: 1, isCurrent: true }),
          makeItem({ id: 2, isCurrent: false }),
          makeItem({ id: 3, isCurrent: false }),
        ]}
      />,
    )

    expect(
      screen.getByText(/you have used all 3 submission attempts/i),
    ).toBeInTheDocument()
  })

  it("treats maxAttemptResubmission: 0 as maxAllowed: 1 (Math.max guard)", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={FUTURE}
        allowResubmissions={true}
        maxAttemptResubmission={0}
        history={[makeItem()]}
      />,
    )

    // Math.max(1, 0) = 1 — one submission in history should trigger the cap
    expect(
      screen.getByText(/you have used all 1 submission attempt/i),
    ).toBeInTheDocument()
  })

  it("shows submit-before reminder and enabled upload when open and under cap", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={FUTURE} history={[]} />)

    expect(screen.getByText(/submit before/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/deadline for this assignment has passed/i),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/you have used all/i)).not.toBeInTheDocument()
    // Button is disabled until a file is chosen — that's correct
    expect(
      screen.getByRole("button", { name: /submit assignment/i }),
    ).toBeDisabled()
  })
})

// ── 2. handleFileChange ─────────────────────────────────────────────────────

describe("handleFileChange", () => {
  it("accepts a valid PDF by MIME type and shows the file name", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    simulateFileSelect(input, makePdfFile("report.pdf"))

    expect(screen.getByText("report.pdf")).toBeInTheDocument()
    expect(
      screen.queryByText(/please select a pdf file/i),
    ).not.toBeInTheDocument()
  })

  it("accepts a file with .pdf extension regardless of MIME type", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const file = new File(["data"], "hw.pdf", { type: "text/plain" })
    simulateFileSelect(input, file)

    expect(screen.getByText("hw.pdf")).toBeInTheDocument()
    expect(
      screen.queryByText(/please select a pdf file/i),
    ).not.toBeInTheDocument()
  })

  it("rejects a non-PDF file and shows an error", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const file = new File(["data"], "photo.png", { type: "image/png" })
    simulateFileSelect(input, file)

    expect(screen.getByText(/please select a pdf file/i)).toBeInTheDocument()
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument()
  })

  it("rejects an oversized PDF and shows a size error", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const OVER_25MB = 26 * 1024 * 1024
    simulateFileSelect(input, makePdfFile("big.pdf", OVER_25MB))

    expect(
      screen.getByText(/pdf must be 25 mb or smaller/i),
    ).toBeInTheDocument()
  })

  it("clears a previous error when a valid file is selected afterwards", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!

    // First: invalid file — sets error
    simulateFileSelect(input, new File(["data"], "photo.png", { type: "image/png" }))
    expect(screen.getByText(/please select a pdf file/i)).toBeInTheDocument()

    // Then: valid file — error clears
    simulateFileSelect(input, makePdfFile("fixed.pdf"))
    expect(
      screen.queryByText(/please select a pdf file/i),
    ).not.toBeInTheDocument()
    expect(screen.getByText("fixed.pdf")).toBeInTheDocument()
  })
})

// ── 3. submitNewVersion ─────────────────────────────────────────────────────

describe("submitNewVersion", () => {
  it("submit button is disabled when no file is selected", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)
    expect(
      screen.getByRole("button", { name: /submit assignment/i }),
    ).toBeDisabled()
  })

  it("does not call fetch when no file is selected", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} />)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("shows success message, clears file, and calls router.refresh() on successful submission", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchOk()
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    await waitFor(() => {
      expect(screen.getByText(/new submission uploaded/i)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(mockRefresh).toHaveBeenCalledTimes(1)
    // File name cleared after success
    expect(screen.queryByText("submission.pdf")).not.toBeInTheDocument()
  })

  it("POSTs to the correct URL with a FormData body containing the file field", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchOk()
    render(
      <AssessmentSubmissionPanel {...defaultProps} courseId={5} assignmentId={9} />,
    )

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile("hw.pdf")))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, options] = (global.fetch as jest.Mock).mock
      .calls[0] as [string, RequestInit]
    expect(url).toBe("/api/courses/5/assessments/9/submit")
    expect(options.method).toBe("POST")
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).get("file")).not.toBeNull()
  })

  it("shows error message from API response on failure", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchError({ error: "Deadline has passed." })
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    await waitFor(() => {
      expect(screen.getByText("Deadline has passed.")).toBeInTheDocument()
    })
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  it("shows fallback error when API error payload is not a string", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchError({ error: 42 })
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/unable to submit assignment\./i),
      ).toBeInTheDocument()
    })
  })

  it("shows fallback error on network failure", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/unable to submit assignment\. please try again/i),
      ).toBeInTheDocument()
    })
  })

  it("disables submit button during in-flight request (double-submit guard)", async () => {
    const user = userEvent.setup()
    let resolveFetch!: (v: unknown) => void
    global.fetch = jest
      .fn()
      .mockReturnValue(new Promise((res) => { resolveFetch = res }))

    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    // While fetch is pending the button should show "Submitting..." and be disabled
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()

    // Resolve so we don't leave open handles
    act(() => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ success: true }) })
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /submitting/i })).not.toBeInTheDocument(),
    )
  })
})

// ── 4. restoreSubmission ────────────────────────────────────────────────────

describe("restoreSubmission", () => {
  const historyWithRestore: MemberSubmissionHistoryItem[] = [
    makeItem({ id: 10, attemptNumber: 2, isCurrent: true,  fileUrl: "/uploads/v2.pdf" }),
    makeItem({ id: 9,  attemptNumber: 1, isCurrent: false, fileUrl: "/uploads/v1.pdf" }),
  ]

  it("shows success message and calls router.refresh() on successful restore", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchOk()
    render(
      <AssessmentSubmissionPanel {...defaultProps} history={historyWithRestore} />,
    )

    await user.click(screen.getByRole("button", { name: /^restore$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/a new version was created from the selected submission/i),
      ).toBeInTheDocument()
    })
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it("POSTs to the correct URL with JSON body containing submissionId", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchOk()
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        courseId={3}
        assignmentId={7}
        history={historyWithRestore}
      />,
    )

    await user.click(screen.getByRole("button", { name: /^restore$/i }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))

    const [url, options] = (global.fetch as jest.Mock).mock
      .calls[0] as [string, RequestInit]
    expect(url).toBe("/api/courses/3/assessments/7/restore")
    expect(options.method).toBe("POST")
    expect(options.headers).toMatchObject({ "Content-Type": "application/json" })
    expect(JSON.parse(options.body as string)).toEqual({ submissionId: 9 })
  })

  it("shows error message from API response on failed restore", async () => {
    const user = userEvent.setup()
    global.fetch = makeFetchError({ error: "Window closed." })
    render(
      <AssessmentSubmissionPanel {...defaultProps} history={historyWithRestore} />,
    )

    await user.click(screen.getByRole("button", { name: /^restore$/i }))

    await waitFor(() => {
      expect(screen.getByText("Window closed.")).toBeInTheDocument()
    })
  })

  it("shows fallback error on network failure during restore", async () => {
    const user = userEvent.setup()
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))
    render(
      <AssessmentSubmissionPanel {...defaultProps} history={historyWithRestore} />,
    )

    await user.click(screen.getByRole("button", { name: /^restore$/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/unable to restore submission\. please try again/i),
      ).toBeInTheDocument()
    })
  })

  it("shows 'Restoring...' during in-flight restore and prevents concurrent calls", async () => {
    const user = userEvent.setup()
    let resolveFetch!: (v: unknown) => void
    global.fetch = jest
      .fn()
      .mockReturnValue(new Promise((res) => { resolveFetch = res }))

    render(
      <AssessmentSubmissionPanel {...defaultProps} history={historyWithRestore} />,
    )

    await user.click(screen.getByRole("button", { name: /^restore$/i }))

    const restoringBtn = screen.getByRole("button", { name: /restoring/i })
    expect(restoringBtn).toBeDisabled()
    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Second click while in-flight — guarded by restoringSubmissionId check
    await user.click(restoringBtn)
    expect(global.fetch).toHaveBeenCalledTimes(1)

    act(() => {
      resolveFetch({ ok: true, json: () => Promise.resolve({ success: true }) })
    })
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /restoring/i })).not.toBeInTheDocument(),
    )
  })

  it("does not render a Restore button after the deadline", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={PAST}
        history={historyWithRestore}
      />,
    )
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })
})

// ── 5. Submission history rendering ─────────────────────────────────────────

describe("Submission history rendering", () => {
  it("shows 'No submissions yet.' when history is empty", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} history={[]} />)
    expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument()
  })

  it("renders a single current item with version number and Current badge", () => {
    render(<AssessmentSubmissionPanel {...defaultProps} history={[makeItem()]} />)
    expect(screen.getByText("Version 1")).toBeInTheDocument()
    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("renders multiple items with correct version numbers; only current has the Current badge", () => {
    const history: MemberSubmissionHistoryItem[] = [
      makeItem({ id: 2, attemptNumber: 2, isCurrent: true }),
      makeItem({ id: 1, attemptNumber: 1, isCurrent: false }),
    ]
    render(<AssessmentSubmissionPanel {...defaultProps} history={history} />)

    expect(screen.getByText("Version 2")).toBeInTheDocument()
    expect(screen.getByText("Version 1")).toBeInTheDocument()
    expect(screen.getAllByText("Current")).toHaveLength(1)
  })

  it("renders a View PDF link pointing to the file API route when fileUrl is present", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        courseId={1}
        assignmentId={2}
        history={[makeItem({ id: 5 })]}
      />,
    )
    const link = screen.getByRole("link", { name: /view pdf/i })
    expect(link).toHaveAttribute(
      "href",
      "/api/courses/1/assessments/2/submissions/5/file",
    )
  })

  it("does not render a View PDF link when fileUrl is null", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        history={[makeItem({ fileUrl: null })]}
      />,
    )
    expect(screen.queryByRole("link", { name: /view pdf/i })).not.toBeInTheDocument()
  })

  it("does not render a Restore button for an item with no fileUrl", () => {
    const history: MemberSubmissionHistoryItem[] = [
      makeItem({ id: 2, isCurrent: true,  fileUrl: "/uploads/v2.pdf" }),
      makeItem({ id: 1, isCurrent: false, fileUrl: null }),
    ]
    render(<AssessmentSubmissionPanel {...defaultProps} history={history} />)
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })

  it("renders a Restore button for a non-current item with fileUrl when deadline is open", () => {
    const history: MemberSubmissionHistoryItem[] = [
      makeItem({ id: 2, isCurrent: true,  fileUrl: "/uploads/v2.pdf" }),
      makeItem({ id: 1, isCurrent: false, fileUrl: "/uploads/v1.pdf" }),
    ]
    render(
      <AssessmentSubmissionPanel {...defaultProps} dueAt={FUTURE} history={history} />,
    )
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument()
  })

  it("does not render a Restore button for the current item", () => {
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        history={[makeItem({ isCurrent: true, fileUrl: "/uploads/v1.pdf" })]}
      />,
    )
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })
})
