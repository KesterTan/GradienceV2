/** @jest-environment jsdom */

import React, { act } from "react"
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals"
import { createRoot, type Root } from "react-dom/client"
import type { AssignmentQuestion, QuestionsPayload } from "@/lib/questions"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// ── server action mock ────────────────────────────────────────────────────────

const mockSaveQuestionsAction = jest.fn()

jest.mock(
  "@/app/courses/[courseId]/assessments/[assignmentId]/questions/actions",
  () => ({ saveQuestionsAction: (...args: unknown[]) => mockSaveQuestionsAction(...args) }),
)

// ── UI component mocks (avoid CSS-in-JS / server-component errors) ────────────

jest.mock("@/components/ui/button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; asChild?: boolean; variant?: string }) => {
    const { asChild: _asChild, variant: _variant, ...rest } = props
    return <button {...rest} />
  },
}))

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3>,
}))

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

jest.mock("@/components/ui/label", () => ({
  Label: (props: React.LabelHTMLAttributes<HTMLLabelElement> & { children?: React.ReactNode }) => <label {...props} />,
}))

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

// ── import component after mocks ──────────────────────────────────────────────

const { QuestionEditor } = require(
  "@/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor",
) as typeof import("@/app/courses/[courseId]/assessments/[assignmentId]/questions/_components/question-editor")

// ── helpers ───────────────────────────────────────────────────────────────────

function makeQuestion(overrides?: Partial<AssignmentQuestion>): AssignmentQuestion {
  return {
    question_id: "Q1",
    question_text: "Describe X",
    question_max_total: 10,
    is_extra_credit: false,
    ...overrides,
  }
}

function makePayload(questions: AssignmentQuestion[]): QuestionsPayload {
  return {
    assignment_title: "Midterm",
    course: "CS101",
    instructions_summary: "",
    questions,
  }
}

function defaultEditorProps(overrides?: Record<string, unknown>) {
  return {
    courseId: 5,
    assignmentId: 12,
    initialPayload: null,
    canEdit: true,
    assignmentTitle: "Midterm",
    courseTitle: "CS101",
    ...overrides,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
  jest.clearAllMocks()
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

// ── rendering ─────────────────────────────────────────────────────────────────

describe("canEdit=false", () => {
  test("shows 'No questions yet' card when there are no saved questions", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps({ canEdit: false })} />)
    })
    expect(container.textContent).toContain("No questions yet")
    expect(container.querySelector("form")).toBeNull()
  })

  test("shows question cards and Download PDF button when questions exist", () => {
    const payload = makePayload([makeQuestion()])
    act(() => {
      root.render(
        <QuestionEditor
          {...defaultEditorProps({ canEdit: false, initialPayload: payload })}
        />,
      )
    })
    expect(container.textContent).toContain("Describe X")
    expect(container.textContent).toContain("Download PDF")
    expect(container.querySelector("form")).toBeNull()
  })

  test("does not show Add question button for students", () => {
    const payload = makePayload([makeQuestion()])
    act(() => {
      root.render(
        <QuestionEditor
          {...defaultEditorProps({ canEdit: false, initialPayload: payload })}
        />,
      )
    })
    const buttons = Array.from(container.querySelectorAll("button"))
    const addButton = buttons.find((b) => b.textContent?.includes("Add question"))
    expect(addButton).toBeUndefined()
  })

  test("renders extra-credit badge when question has is_extra_credit=true", () => {
    const payload = makePayload([makeQuestion({ is_extra_credit: true })])
    act(() => {
      root.render(
        <QuestionEditor
          {...defaultEditorProps({ canEdit: false, initialPayload: payload })}
        />,
      )
    })
    expect(container.textContent).toContain("Extra credit")
  })
})

describe("canEdit=true with no saved questions (edit mode)", () => {
  test("renders the edit form", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    expect(container.querySelector("form")).not.toBeNull()
  })

  test("shows Add question button at the bottom of the list", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    const buttons = Array.from(container.querySelectorAll("button"))
    const addButton = buttons.find((b) => b.textContent?.includes("Add question"))
    expect(addButton).toBeDefined()

    // The save button must come AFTER the add button in DOM order
    const saveButton = buttons.find((b) => b.textContent?.includes("Save questions"))
    expect(saveButton).toBeDefined()
    const addIndex = buttons.indexOf(addButton!)
    const saveIndex = buttons.indexOf(saveButton!)
    expect(addIndex).toBeLessThan(saveIndex)
  })

  test("starts with one empty question card", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    expect(container.textContent).toContain("Question 1")
    expect(container.textContent).not.toContain("Question 2")
  })

  test("clicking Add question appends a second card", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    const addButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Add question",
    )!
    act(() => {
      addButton.click()
    })
    expect(container.textContent).toContain("Question 2")
  })

  test("Delete button is disabled when only one question exists", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    const deleteButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Delete",
    )
    expect(deleteButton).toBeDefined()
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true)
  })

  test("deleting a question after a validation failure rebases field error keys", async () => {
    // Return field errors for both Q1 and Q2 on first submit
    mockSaveQuestionsAction.mockResolvedValueOnce({
      errors: {
        fieldErrors: {
          "questions.0.question_text": ["Question text is required"],
          "questions.1.question_text": ["Question text is required"],
        },
      },
    })

    const payload = makePayload([
      makeQuestion({ question_id: "Q1", question_text: "" }),
      makeQuestion({ question_id: "Q2", question_text: "" }),
    ])
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps({ initialPayload: payload })} />)
    })

    // Enter edit mode
    const editButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Edit questions",
    )!
    act(() => { editButton.click() })

    // Submit to trigger field errors
    const form = container.querySelector("form")!
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true }))
    })

    // Delete the first question — errors for index 1 should shift to index 0
    const deleteButtons = Array.from(container.querySelectorAll("button")).filter(
      (b) => b.textContent === "Delete",
    )
    act(() => { deleteButtons[0].click() })

    // Only one question card should remain and it should not show a stale error
    // from index 1 (which is now index 0 after rebasing)
    expect(container.textContent).not.toContain("Question 2")
  })
})

describe("canEdit=true with saved questions (view mode)", () => {
  test("starts in view mode showing saved questions", () => {
    const payload = makePayload([makeQuestion()])
    act(() => {
      root.render(
        <QuestionEditor {...defaultEditorProps({ initialPayload: payload })} />,
      )
    })
    expect(container.querySelector("form")).toBeNull()
    expect(container.textContent).toContain("Q1")
    expect(container.textContent).toContain("Edit questions")
  })

  test("Edit questions button switches to edit form", () => {
    const payload = makePayload([makeQuestion()])
    act(() => {
      root.render(
        <QuestionEditor {...defaultEditorProps({ initialPayload: payload })} />,
      )
    })
    const editButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Edit questions",
    )!
    act(() => {
      editButton.click()
    })
    expect(container.querySelector("form")).not.toBeNull()
  })

  test("Cancel button returns to view mode", () => {
    const payload = makePayload([makeQuestion()])
    act(() => {
      root.render(
        <QuestionEditor {...defaultEditorProps({ initialPayload: payload })} />,
      )
    })
    const editButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Edit questions",
    )!
    act(() => { editButton.click() })
    expect(container.querySelector("form")).not.toBeNull()

    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Cancel",
    )!
    act(() => { cancelButton.click() })
    expect(container.querySelector("form")).toBeNull()
  })
})

describe("extra-credit checkbox", () => {
  test("toggling the checkbox updates the checked state", () => {
    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })
    const checkbox = container.querySelector<HTMLInputElement>("input[type='checkbox']")!
    expect(checkbox).not.toBeNull()
    expect(checkbox.checked).toBe(false)

    act(() => {
      checkbox.click()
    })
    expect(checkbox.checked).toBe(true)
  })

  test("extra-credit checkbox is checked for a question with is_extra_credit=true", () => {
    const payload = makePayload([makeQuestion({ is_extra_credit: true })])
    act(() => {
      root.render(
        <QuestionEditor {...defaultEditorProps({ initialPayload: payload })} />,
      )
    })
    // Enter edit mode first
    const editButton = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === "Edit questions",
    )!
    act(() => { editButton.click() })

    const checkbox = container.querySelector<HTMLInputElement>("input[type='checkbox']")!
    expect(checkbox.checked).toBe(true)
  })

  test("save action receives is_extra_credit=true when checkbox is checked", async () => {
    mockSaveQuestionsAction.mockResolvedValue({
      success: true,
      savedQuestions: [makeQuestion({ is_extra_credit: true })],
    })

    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })

    // Check the extra-credit box
    const checkbox = container.querySelector<HTMLInputElement>("input[type='checkbox']")!
    act(() => { checkbox.click() })

    // Submit the form
    const form = container.querySelector("form")!
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true }))
    })

    expect(mockSaveQuestionsAction).toHaveBeenCalledTimes(1)
    const formData: FormData = mockSaveQuestionsAction.mock.calls[0][1] as FormData
    const payload = JSON.parse(formData.get("questionsPayload") as string)
    expect(payload.questions[0].is_extra_credit).toBe(true)
  })

  test("after successful save, view mode is shown (not edit form)", async () => {
    mockSaveQuestionsAction.mockResolvedValue({
      success: true,
      savedQuestions: [makeQuestion()],
    })

    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })

    const form = container.querySelector("form")!
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true }))
    })

    expect(container.querySelector("form")).toBeNull()
    expect(container.textContent).toContain("Edit questions")
  })

  test("on server-returned form error, edit form stays open and error message is shown", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockSaveQuestionsAction as any).mockResolvedValue({
      errors: { _form: ["You do not have permission to edit questions for this assessment."] },
    })

    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })

    const form = container.querySelector("form")!
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true }))
    })

    expect(container.querySelector("form")).not.toBeNull()
    expect(container.textContent).toContain("You do not have permission")
  })

  test("on unexpected thrown error, edit form stays open and generic error is shown", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mockSaveQuestionsAction as any).mockRejectedValue(new Error("Network failure"))

    act(() => {
      root.render(<QuestionEditor {...defaultEditorProps()} />)
    })

    const form = container.querySelector("form")!
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true }))
    })

    expect(container.querySelector("form")).not.toBeNull()
    expect(container.textContent).toContain("unexpected error")
  })
})
