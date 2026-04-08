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

// Stable date format so tests aren't coupled to locale/timezone differences
jest.mock("date-fns", () => ({
  format: (_date: Date, _fmt: string) => "Jan 1, 2026 at 12:00 PM",
}))

import { AssessmentSubmissionPanel } from "@/components/assessment-submission-panel"

// ─── Helpers ─────────────────────────────────────────────────────────────────

// PAST: a date well before "now" — used as dueAt when the deadline has already passed
const PAST = "2000-01-01T00:00:00.000Z"
// PAST_LATE: also in the past, but after PAST — used as lateUntil when the late window has also closed
const PAST_LATE = "2001-01-01T00:00:00.000Z"
// FUTURE: a date well after "now" — used for open deadlines or active late windows
const FUTURE = "2099-12-31T23:59:59.000Z"

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
  lateUntil: null,
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
 * accept-attribute filtering, which silently drops non-PDF files before
 * onChange fires — exactly the scenario we need to test for rejection cases.
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
//
// The component derives five values from props on every render:
//
//   isPastDue       = now > dueDate
//   inLateWindow    = isPastDue && lateUntil !== null && now <= lateDate
//   submissionsClosed = !isInstructor && isPastDue && !inLateWindow
//   maxAllowed      = allowResubmissions ? Math.max(1, maxAttemptResubmission) : 1
//   maxReached      = history.length >= maxAllowed
//   uploadDisabled  = submissionsClosed || maxReached
//
// These control which banners are visible and whether the upload area / submit
// button are active. All tests in this group render the component and assert
// on the resulting DOM — no user interaction required.

describe("Eligibility logic", () => {

  // ── A. Student deadline states (no late window) ──────────────────────────

  it("shows submit-before reminder and enables upload when deadline has not passed", () => {
    // isPastDue=false → submissionsClosed=false, uploadDisabled=false.
    // The "submit before" reminder should appear, no error banners should be
    // present, and the upload area should be interactive. The submit button
    // starts disabled because no file has been chosen yet — that's expected.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={FUTURE} lateUntil={null} />)

    expect(screen.getByText(/submit before/i)).toBeInTheDocument()
    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/you have used all/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/past the deadline/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("closes submissions and shows deadline banner when past due with no late window", () => {
    // isPastDue=true, lateUntil=null → inLateWindow=false, submissionsClosed=true.
    // The hard deadline banner should appear, the "submit before" reminder should
    // be gone, and the submit button should be disabled.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} lateUntil={null} />)

    expect(screen.getByText(/deadline for this assignment has passed/i)).toBeInTheDocument()
    expect(screen.queryByText(/submit before/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  // ── B. Student late window states ────────────────────────────────────────

  it("keeps upload open and shows late-submission warning when inside the late window", () => {
    // isPastDue=true, lateUntil=FUTURE, now <= lateDate → inLateWindow=true,
    // submissionsClosed=false. The student can still submit but the amber
    // "will be marked as late" banner must be shown. The hard deadline banner
    // and the "submit before" reminder must both be absent (the late window
    // replaces them).
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} lateUntil={FUTURE} />)

    expect(screen.getByText(/past the deadline.*marked as late/i)).toBeInTheDocument()
    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/submit before/i)).not.toBeInTheDocument()
    // Upload is still enabled — submissionsClosed is false in the late window
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled() // disabled until file chosen, not due to deadline
  })

  it("closes submissions when past due AND past the late window", () => {
    // isPastDue=true, lateUntil=PAST_LATE (also in the past), now > lateDate →
    // inLateWindow=false, submissionsClosed=true. Both the due date and the
    // grace period have elapsed, so behaviour should match a plain past-deadline
    // scenario: hard deadline banner shown, upload disabled.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} lateUntil={PAST_LATE} />)

    expect(screen.getByText(/deadline for this assignment has passed/i)).toBeInTheDocument()
    expect(screen.queryByText(/past the deadline.*marked as late/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("ignores lateUntil when the due date has not yet passed", () => {
    // isPastDue=false → inLateWindow requires isPastDue, so even if lateUntil
    // is set the late window banner must not appear. The component should look
    // identical to a normal open state: "submit before" reminder, no banners.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={FUTURE} lateUntil={FUTURE} />)

    expect(screen.getByText(/submit before/i)).toBeInTheDocument()
    expect(screen.queryByText(/past the deadline.*marked as late/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
  })

  // ── C. Instructor bypass ─────────────────────────────────────────────────

  it("never closes submissions for an instructor even when past the due date", () => {
    // submissionsClosed = !isInstructor && isPastDue && !inLateWindow.
    // When isInstructor=true the entire deadline check is short-circuited to
    // false, so the upload area stays open regardless of dueAt.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} lateUntil={null} isInstructor />)

    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled() // still disabled until file chosen
  })

  it("does not show the late-submission warning banner for an instructor", () => {
    // The late banner is guarded by !isInstructor. Even when the student-visible
    // late window would be active (dueAt past, lateUntil future), an instructor
    // should see neither the late warning nor the hard deadline banner.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={PAST} lateUntil={FUTURE} isInstructor />)

    expect(screen.queryByText(/past the deadline.*marked as late/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
  })

  it("does not show the submit-before reminder for an instructor", () => {
    // The submit-before reminder is also guarded by !isInstructor. Instructors
    // manage deadlines; showing them a student-facing countdown would be confusing.
    render(<AssessmentSubmissionPanel {...defaultProps} dueAt={FUTURE} lateUntil={null} isInstructor />)

    expect(screen.queryByText(/submit before/i)).not.toBeInTheDocument()
  })

  // ── D. Attempt cap ───────────────────────────────────────────────────────

  it("allows upload when allowResubmissions is false and no submission has been made yet", () => {
    // maxAllowed=1 (resubmissions off), history.length=0 → maxReached=false,
    // uploadDisabled=false. The student has their one attempt still available.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[]}
      />,
    )

    expect(screen.queryByText(/you have used all/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled() // awaiting file
  })

  it("blocks upload and shows attempt-limit banner (singular) when the single allowed attempt is used", () => {
    // maxAllowed=1 (resubmissions off), history.length=1 → maxReached=true,
    // uploadDisabled=true. The "1 submission attempt" singular form must be shown.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[makeItem()]}
      />,
    )

    expect(screen.getByText(/you have used all 1 submission attempt[^s]/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("allows upload when allowResubmissions is true and attempts remain", () => {
    // maxAllowed=3, history.length=2 → maxReached=false. With one attempt still
    // available the upload area should be open and no cap banner should appear.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        allowResubmissions={true}
        maxAttemptResubmission={3}
        history={[makeItem({ id: 1 }), makeItem({ id: 2, isCurrent: false })]}
      />,
    )

    expect(screen.queryByText(/you have used all/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled() // awaiting file
  })

  it("blocks upload and shows attempt-limit banner (plural) when all resubmission attempts are used", () => {
    // maxAllowed=3, history.length=3 → maxReached=true, uploadDisabled=true.
    // The banner must use the plural "attempts" form.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        allowResubmissions={true}
        maxAttemptResubmission={3}
        history={[
          makeItem({ id: 1, isCurrent: true }),
          makeItem({ id: 2, isCurrent: false }),
          makeItem({ id: 3, isCurrent: false }),
        ]}
      />,
    )

    expect(screen.getByText(/you have used all 3 submission attempts/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("treats maxAttemptResubmission: 0 as maxAllowed: 1 via the Math.max guard", () => {
    // allowResubmissions=true but maxAttemptResubmission=0 is a degenerate
    // config that should never allow 0 attempts. Math.max(1, 0)=1 clamps it to
    // at least one, so a single submission in history should hit the cap.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        allowResubmissions={true}
        maxAttemptResubmission={0}
        history={[makeItem()]}
      />,
    )

    expect(screen.getByText(/you have used all 1 submission attempt[^s]/i)).toBeInTheDocument()
  })

  // ── E. Combined states ───────────────────────────────────────────────────

  it("shows only the deadline banner (not the attempt-limit banner) when both submissionsClosed and maxReached are true", () => {
    // submissionsClosed=true, maxReached=true. The attempt-limit banner is
    // guarded by !submissionsClosed, so when the deadline has also passed only
    // the hard deadline banner should be visible — showing both would be redundant
    // and confusing.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={PAST}
        lateUntil={null}
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[makeItem()]}
      />,
    )

    expect(screen.getByText(/deadline for this assignment has passed/i)).toBeInTheDocument()
    expect(screen.queryByText(/you have used all/i)).not.toBeInTheDocument()
  })

  it("shows the attempt-limit banner (not the late warning) when in the late window but all attempts are used", () => {
    // inLateWindow=true, maxReached=true. The late-window banner is guarded by
    // !maxReached, so the more actionable "you've hit your cap" message takes
    // priority. Upload is still disabled (via maxReached), and the student
    // can still restore a previous version.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={PAST}
        lateUntil={FUTURE}
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[makeItem()]}
      />,
    )

    expect(screen.getByText(/you have used all 1 submission attempt[^s]/i)).toBeInTheDocument()
    expect(screen.queryByText(/past the deadline.*marked as late/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("shows the attempt-limit banner for an instructor who has hit the cap, even though the deadline is bypassed", () => {
    // isInstructor=true, submissionsClosed=false (deadline bypassed), but
    // maxReached=true → uploadDisabled=true. The cap still applies to instructors;
    // only the deadline restriction is lifted. The attempt-limit banner should
    // appear and the submit button should be disabled.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={PAST}
        lateUntil={null}
        isInstructor
        allowResubmissions={false}
        maxAttemptResubmission={1}
        history={[makeItem()]}
      />,
    )

    expect(screen.getByText(/you have used all 1 submission attempt[^s]/i)).toBeInTheDocument()
    expect(screen.queryByText(/deadline for this assignment has passed/i)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })
})

// ── 2. handleFileChange ─────────────────────────────────────────────────────

describe("handleFileChange", () => {
  it("accepts a valid PDF by MIME type and shows the file name", () => {
    // The primary acceptance path: a file with type "application/pdf" should
    // pass both checks (MIME type and size) and have its name displayed in the
    // upload area. No error message should appear.
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    simulateFileSelect(input, makePdfFile("report.pdf"))

    expect(screen.getByText("report.pdf")).toBeInTheDocument()
    expect(screen.queryByText(/please select a pdf file/i)).not.toBeInTheDocument()
  })

  it("accepts a file with .pdf extension regardless of MIME type", () => {
    // Some operating systems report PDF files with a generic MIME type such as
    // "text/plain". The component falls back to checking the file extension, so
    // a file named "hw.pdf" with a non-PDF MIME type should still be accepted.
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const file = new File(["data"], "hw.pdf", { type: "text/plain" })
    simulateFileSelect(input, file)

    expect(screen.getByText("hw.pdf")).toBeInTheDocument()
    expect(screen.queryByText(/please select a pdf file/i)).not.toBeInTheDocument()
  })

  it("rejects a non-PDF file and shows an error", () => {
    // A file that is neither application/pdf MIME type nor has a .pdf extension
    // should be rejected immediately with a clear error. The file name must not
    // be stored in state (the upload area should not show it).
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const file = new File(["data"], "photo.png", { type: "image/png" })
    simulateFileSelect(input, file)

    expect(screen.getByText(/please select a pdf file/i)).toBeInTheDocument()
    expect(screen.queryByText("photo.png")).not.toBeInTheDocument()
  })

  it("rejects an oversized PDF and shows a size error", () => {
    // A PDF over the 25 MB limit must be rejected. The component checks size
    // after the type check, so this test uses a valid PDF MIME type but a size
    // that exceeds MAX_FILE_SIZE_BYTES (25 * 1024 * 1024).
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    const OVER_25MB = 26 * 1024 * 1024
    simulateFileSelect(input, makePdfFile("big.pdf", OVER_25MB))

    expect(screen.getByText(/pdf must be 25 mb or smaller/i)).toBeInTheDocument()
  })

  it("clears a previous error when a valid file is selected afterwards", () => {
    // If the user first picks an invalid file (which sets an error), then picks
    // a valid PDF, the error should disappear and the new file name should be
    // shown. Stale errors would mislead the user into thinking their valid
    // submission is still broken.
    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!

    // First: invalid file — sets error
    simulateFileSelect(input, new File(["data"], "photo.png", { type: "image/png" }))
    expect(screen.getByText(/please select a pdf file/i)).toBeInTheDocument()

    // Then: valid file — error should clear
    simulateFileSelect(input, makePdfFile("fixed.pdf"))
    expect(screen.queryByText(/please select a pdf file/i)).not.toBeInTheDocument()
    expect(screen.getByText("fixed.pdf")).toBeInTheDocument()
  })
})

// ── 3. submitNewVersion ─────────────────────────────────────────────────────

describe("submitNewVersion", () => {
  it("submit button is disabled when no file is selected", () => {
    // The button's disabled prop is `!selectedFile || isSubmitting || uploadDisabled`.
    // With no file selected and an open deadline, only the first condition is
    // true — confirming the guard works before any interaction.
    render(<AssessmentSubmissionPanel {...defaultProps} />)
    expect(screen.getByRole("button", { name: /submit assignment/i })).toBeDisabled()
  })

  it("does not call fetch when no file is selected", () => {
    // Belt-and-suspenders: even if the button guard were bypassed, the function
    // itself also returns early when selectedFile is null. fetch must never fire.
    render(<AssessmentSubmissionPanel {...defaultProps} />)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("shows success message, clears file, and calls router.refresh() on successful submission", async () => {
    // Happy path: a file is selected, the button is clicked, the API returns ok.
    // Three things must happen after success: the "New submission uploaded."
    // message appears, the file name disappears from the upload area (state
    // cleared), and router.refresh() is called so the history list updates.
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
    expect(screen.queryByText("submission.pdf")).not.toBeInTheDocument()
  })

  it("POSTs to the correct URL with a FormData body containing the file field", async () => {
    // Verifies the exact shape of the outgoing request. If the URL is wrong or
    // the FormData field name doesn't match what the server expects ("file"),
    // submissions would fail silently from the UI's perspective.
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
    // When the API returns ok: false with a string error field, that exact
    // string should be shown to the user. router.refresh() must NOT be called
    // since the submission did not succeed.
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
    // The component guards against a non-string error field with
    // `typeof payload.error === "string"`. If the server sends a number or
    // object, the generic fallback message must appear instead.
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
    // When fetch itself rejects (e.g. no network), the catch block fires and
    // the "please try again" variant of the fallback message should appear,
    // distinguishing a connectivity problem from an API-level error.
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
    // Users often double-click when nothing appears to happen immediately.
    // While a submit is in flight, the button must show "Submitting..." and be
    // disabled so a second click cannot trigger a duplicate upload.
    const user = userEvent.setup()
    let resolveFetch!: (v: unknown) => void
    global.fetch = jest
      .fn()
      .mockReturnValue(new Promise((res) => { resolveFetch = res }))

    render(<AssessmentSubmissionPanel {...defaultProps} />)

    const input = document.querySelector<HTMLInputElement>("#submission-pdf")!
    act(() => simulateFileSelect(input, makePdfFile()))

    await user.click(screen.getByRole("button", { name: /submit assignment/i }))

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()

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
  // A two-item history: item 10 is the current version, item 9 is an older
  // version that can be restored. This is the minimum setup needed to render
  // a Restore button.
  const historyWithRestore: MemberSubmissionHistoryItem[] = [
    makeItem({ id: 10, attemptNumber: 2, isCurrent: true,  fileUrl: "/uploads/v2.pdf" }),
    makeItem({ id: 9,  attemptNumber: 1, isCurrent: false, fileUrl: "/uploads/v1.pdf" }),
  ]

  it("shows success message and calls router.refresh() on successful restore", async () => {
    // Happy path: the Restore button is clicked, the API returns ok. The
    // success message must appear and router.refresh() must be called so the
    // history list reflects the newly created version.
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
    // Verifies the exact shape of the restore request. The server needs the
    // submissionId to know which file to copy. If the Content-Type header is
    // missing or the body field name is wrong the server will reject the request.
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
    // When the API returns ok: false with a string error field, that exact
    // string should be shown to the user.
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
    // When fetch rejects entirely the catch block fires with the "please try
    // again" variant, consistent with the submit error handling.
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
    // The guard `if (restoringSubmissionId !== null) return` prevents firing
    // two simultaneous restores. While a restore is in flight: (a) the button
    // must show "Restoring..." and be disabled, and (b) a second click must not
    // produce a second fetch call.
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
    // The Restore button is conditionally rendered only when !submissionsClosed.
    // Once the deadline has passed (and there is no late window), all restore
    // buttons must disappear so a student cannot create new versions after the
    // grading window closes.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        dueAt={PAST}
        lateUntil={null}
        history={historyWithRestore}
      />,
    )
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })
})

// ── 5. Submission history rendering ─────────────────────────────────────────

describe("Submission history rendering", () => {
  it("shows 'No submissions yet.' when history is empty", () => {
    // An empty history array should render the empty-state message rather than
    // an empty list — gives the student clear feedback that nothing has been
    // submitted yet.
    render(<AssessmentSubmissionPanel {...defaultProps} history={[]} />)
    expect(screen.getByText(/no submissions yet/i)).toBeInTheDocument()
  })

  it("renders a single current item with version number and Current badge", () => {
    // The first (and only) submission should be labelled "Version 1" and
    // carry the "Current" badge indicating it is the active version.
    render(<AssessmentSubmissionPanel {...defaultProps} history={[makeItem()]} />)
    expect(screen.getByText("Version 1")).toBeInTheDocument()
    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("renders multiple items with correct version numbers; only current has the Current badge", () => {
    // Each history item shows its own attempt number. Exactly one item — the
    // one with isCurrent=true — should carry the "Current" badge. Showing
    // "Current" on older versions would mislead the student about which
    // submission is being graded.
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
    // When the submission has a stored file, a "View PDF" link must point to
    // the server route that streams the file. Verifying the full URL ensures
    // courseId, assignmentId, and submissionId are all interpolated correctly.
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
    // A submission without a stored file (e.g., the upload failed partway
    // through) should not show a broken link — the View PDF button must be
    // absent entirely.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        history={[makeItem({ fileUrl: null })]}
      />,
    )
    expect(screen.queryByRole("link", { name: /view pdf/i })).not.toBeInTheDocument()
  })

  it("does not render a Restore button for an item with no fileUrl", () => {
    // Restore creates a new submission by copying an existing file. If the
    // file doesn't exist (fileUrl is null), the Restore button must be hidden
    // because the server would reject the request anyway.
    const history: MemberSubmissionHistoryItem[] = [
      makeItem({ id: 2, isCurrent: true,  fileUrl: "/uploads/v2.pdf" }),
      makeItem({ id: 1, isCurrent: false, fileUrl: null }),
    ]
    render(<AssessmentSubmissionPanel {...defaultProps} history={history} />)
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })

  it("renders a Restore button for a non-current item with fileUrl when deadline is open", () => {
    // The standard restore scenario: a prior version with a file exists and the
    // deadline has not passed. The Restore button should be visible so the
    // student can revert to that version.
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
    // Restoring the current submission would create a redundant duplicate.
    // The Restore button is intentionally hidden for the item marked isCurrent,
    // even if it has a fileUrl.
    render(
      <AssessmentSubmissionPanel
        {...defaultProps}
        history={[makeItem({ isCurrent: true, fileUrl: "/uploads/v1.pdf" })]}
      />,
    )
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument()
  })
})
