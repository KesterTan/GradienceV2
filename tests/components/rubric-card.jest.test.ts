/** @jest-environment jsdom */

import React, { act } from "react"
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals"
import { createRoot, type Root } from "react-dom/client"

const { RubricCard } = require("@/components/rubric-card") as typeof import("@/components/rubric-card")

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function createQuestion() {
  return {
    id: "q-1",
    title: "Question 1: Explain MVC",
    content: "Explain the model, view, and controller responsibilities in detail.",
  }
}

function createRubric() {
  return {
    id: "rubric-1",
    questionTitle: "Question 1: Explain MVC",
    totalPoints: 8,
    criteria: [
      {
        id: "criterion-1",
        title: "Concept accuracy",
        maxPoints: 5,
        description: "Defines each MVC layer correctly.",
      },
      {
        id: "criterion-2",
        title: "Examples",
        maxPoints: 3,
        description: "Uses a practical example.",
      },
    ],
  }
}

function changeInput(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  act(() => {
    const prototype = element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set
    setter?.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

function click(element: Element | null) {
  if (!element) {
    throw new Error("Expected element to exist before clicking")
  }

  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

describe("RubricCard", () => {
  let container: HTMLDivElement
  let root: Root

  function renderCard(
    overrides: Partial<React.ComponentProps<typeof RubricCard>> = {},
  ) {
    const props: React.ComponentProps<typeof RubricCard> = {
      question: createQuestion(),
      rubric: null,
      isGenerated: false,
      isLoading: false,
      onGenerate: jest.fn(),
      onUpdateRubric: jest.fn(),
      index: 0,
      ...overrides,
    }

    act(() => {
      root.render(React.createElement(RubricCard, props))
    })

    return props
  }

  function getByTestId(testId: string) {
    const element = container.querySelector(`[data-testid="${testId}"]`)
    if (!element) {
      throw new Error(`Expected element with data-testid="${testId}"`)
    }
    return element
  }

  function queryByTestId(testId: string) {
    return container.querySelector(`[data-testid="${testId}"]`)
  }

  function getTitleInput(index: number) {
    return getByTestId(`criterion-title-${index}`) as HTMLInputElement
  }

  function getPointsInput(index: number) {
    return getByTestId(`criterion-points-${index}`) as HTMLInputElement
  }

  function getDescriptionInput(index: number) {
    return getByTestId(`criterion-description-${index}`) as HTMLTextAreaElement
  }

  beforeEach(() => {
    document.body.innerHTML = ""
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
  })

  test("shows the empty state and keeps save disabled until a criterion title is entered", () => {
    renderCard()

    expect(container.textContent).toContain("No rubric yet")

    click(getByTestId("write-rubric-button"))

    const saveButton = getByTestId("save-rubric-button") as HTMLButtonElement
    expect(saveButton).toBeDisabled()
    expect(container.querySelector('button[aria-label^="Remove criterion"]')).toBeNull()

    changeInput(getTitleInput(0), "Accuracy")

    expect(saveButton).not.toBeDisabled()
  })

  test("filters empty criteria, allows empty descriptions, and normalizes unusual point values before saving", () => {
    const onUpdateRubric = jest.fn()

    renderCard({ onUpdateRubric })
    click(getByTestId("write-rubric-button"))

    changeInput(getTitleInput(0), "Accuracy")
    changeInput(getPointsInput(0), "0")
    expect(getPointsInput(0).value).toBe("1")
    changeInput(getPointsInput(0), "-5")
    expect(getPointsInput(0).value).toBe("1")
    changeInput(getPointsInput(0), "not-a-number")
    expect(getPointsInput(0).value).toBe("1")

    click(getByTestId("add-criterion-button"))
    changeInput(getPointsInput(1), "9999")
    expect(getPointsInput(1).value).toBe("9999")

    click(getByTestId("add-criterion-button"))
    changeInput(getTitleInput(2), "Examples")
    changeInput(getPointsInput(2), "9999")

    click(getByTestId("save-rubric-button"))

    expect(onUpdateRubric).toHaveBeenCalledWith({
      id: "custom-r-q-1",
      questionTitle: "Question 1: Explain MVC",
      totalPoints: 10000,
      criteria: [
        {
          id: expect.stringMatching(/^custom-/),
          title: "Accuracy",
          maxPoints: 1,
          description: "",
        },
        {
          id: expect.stringMatching(/^custom-/),
          title: "Examples",
          maxPoints: 9999,
          description: "",
        },
      ],
    })
  })

  test("hides rubric actions while loading so no generate or edit interactions are available", () => {
    const onGenerate = jest.fn()
    const onUpdateRubric = jest.fn()

    renderCard({
      isLoading: true,
      onGenerate,
      onUpdateRubric,
    })

    expect(container.textContent).toContain("Generating...")
    expect(container.textContent).toContain("Analyzing question...")
    expect(queryByTestId("generate-rubric-button")).toBeNull()
    expect(queryByTestId("write-rubric-button")).toBeNull()
    expect(queryByTestId("edit-rubric-button")).toBeNull()
    expect(queryByTestId("regenerate-rubric-button")).toBeNull()
    expect(queryByTestId("save-rubric-button")).toBeNull()
    expect(onGenerate).not.toHaveBeenCalled()
    expect(onUpdateRubric).not.toHaveBeenCalled()
  })

  test("cancels transient add and remove edits without leaking stale state", () => {
    renderCard({
      rubric: createRubric(),
      isGenerated: true,
    })

    click(getByTestId("edit-rubric-button"))
    click(getByTestId("add-criterion-button"))

    expect(container.querySelectorAll('[data-testid^="criterion-title-"]')).toHaveLength(3)

    click(getByTestId("cancel-rubric-button"))

    expect(container.textContent).toContain("Concept accuracy")
    expect(container.textContent).toContain("Examples")
    expect(container.textContent).not.toContain("Criterion title")

    click(getByTestId("edit-rubric-button"))
    click(container.querySelector('button[aria-label="Remove criterion 2"]'))

    expect(container.querySelectorAll('[data-testid^="criterion-title-"]')).toHaveLength(1)

    click(getByTestId("cancel-rubric-button"))

    expect(container.textContent).toContain("Concept accuracy")
    expect(container.textContent).toContain("Examples")
  })

  test("recomputes total points after repeated edits and reloads the latest saved values on the next edit", () => {
    const onUpdateRubric = jest.fn()
    const baseRubric = createRubric()

    renderCard({
      rubric: baseRubric,
      isGenerated: true,
      onUpdateRubric,
    })

    click(getByTestId("edit-rubric-button"))
    changeInput(getTitleInput(0), "Accuracy revised")
    changeInput(getPointsInput(0), "10")
    changeInput(getPointsInput(0), "6")
    changeInput(getPointsInput(1), "8")

    click(getByTestId("save-rubric-button"))

    expect(onUpdateRubric).toHaveBeenCalledWith({
      id: "rubric-1",
      questionTitle: "Question 1: Explain MVC",
      totalPoints: 14,
      criteria: [
        {
          id: "criterion-1",
          title: "Accuracy revised",
          maxPoints: 6,
          description: "Defines each MVC layer correctly.",
        },
        {
          id: "criterion-2",
          title: "Examples",
          maxPoints: 8,
          description: "Uses a practical example.",
        },
      ],
    })

    const updatedRubric = onUpdateRubric.mock.calls[0][0]

    renderCard({
      rubric: updatedRubric,
      isGenerated: true,
      onUpdateRubric,
    })

    click(getByTestId("edit-rubric-button"))

    expect(getTitleInput(0).value).toBe("Accuracy revised")
    expect(getPointsInput(0).value).toBe("6")
    expect(getPointsInput(1).value).toBe("8")
  })

  test("supports a full create, edit, save, remove, and regenerate sequence", () => {
    const onGenerate = jest.fn()
    let latestRubric: ReturnType<typeof createRubric> | null = null

    const onUpdateRubric = jest.fn((rubric) => {
      latestRubric = rubric
    })

    renderCard({
      onGenerate,
      onUpdateRubric,
    })

    click(getByTestId("write-rubric-button"))
    changeInput(getTitleInput(0), "Accuracy")
    changeInput(getPointsInput(0), "5")
    click(getByTestId("save-rubric-button"))

    expect(latestRubric).not.toBeNull()

    renderCard({
      rubric: latestRubric,
      isGenerated: true,
      onGenerate,
      onUpdateRubric,
    })

    click(getByTestId("edit-rubric-button"))
    click(getByTestId("add-criterion-button"))
    changeInput(getTitleInput(1), "Examples")
    changeInput(getPointsInput(1), "4")
    click(getByTestId("save-rubric-button"))

    expect(latestRubric?.totalPoints).toBe(9)
    expect(latestRubric?.criteria).toHaveLength(2)

    renderCard({
      rubric: latestRubric,
      isGenerated: true,
      onGenerate,
      onUpdateRubric,
    })

    click(getByTestId("edit-rubric-button"))
    click(container.querySelector('button[aria-label="Remove criterion 2"]'))
    click(getByTestId("save-rubric-button"))

    expect(latestRubric?.totalPoints).toBe(5)
    expect(latestRubric?.criteria).toHaveLength(1)

    renderCard({
      rubric: latestRubric,
      isGenerated: true,
      onGenerate,
      onUpdateRubric,
    })

    click(getByTestId("regenerate-rubric-button"))
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })
})
