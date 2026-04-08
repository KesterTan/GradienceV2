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

  test("starts manual editing for a question without a rubric and saves the updated rubric", () => {
    const onGenerate = jest.fn()
    const onUpdateRubric = jest.fn()

    act(() => {
      root.render(
        React.createElement(RubricCard, {
          question: createQuestion(),
          rubric: null,
          isGenerated: false,
          isLoading: false,
          onGenerate,
          onUpdateRubric,
          index: 0,
        }),
      )
    })

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Write Rubric")) ?? null)

    const titleInput = container.querySelector('input[placeholder*="Criterion title"]') as HTMLInputElement | null
    const pointsInput = container.querySelector('input[type="number"]') as HTMLInputElement | null
    const descriptionInput = container.querySelector("textarea") as HTMLTextAreaElement | null

    expect(titleInput).not.toBeNull()
    expect(pointsInput).not.toBeNull()
    expect(descriptionInput).not.toBeNull()

    changeInput(titleInput!, "Accuracy")
    changeInput(pointsInput!, "7")
    changeInput(descriptionInput!, "Covers the three MVC layers correctly.")

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Add Criterion")) ?? null)

    const criterionTitleInputs = Array.from(
      container.querySelectorAll('input[placeholder*="Criterion title"]'),
    ) as HTMLInputElement[]
    const criterionPointInputs = Array.from(container.querySelectorAll('input[type="number"]')) as HTMLInputElement[]
    const criterionDescriptionInputs = Array.from(container.querySelectorAll("textarea")) as HTMLTextAreaElement[]

    changeInput(criterionTitleInputs[1], "Examples")
    changeInput(criterionPointInputs[1], "4")
    changeInput(criterionDescriptionInputs[1], "Includes a practical framework example.")

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Save Rubric")) ?? null)

    expect(onGenerate).not.toHaveBeenCalled()
    expect(onUpdateRubric).toHaveBeenCalledWith({
      id: "custom-r-q-1",
      questionTitle: "Question 1: Explain MVC",
      totalPoints: 11,
      criteria: [
        {
          id: expect.stringMatching(/^custom-/),
          title: "Accuracy",
          maxPoints: 7,
          description: "Covers the three MVC layers correctly.",
        },
        {
          id: expect.stringMatching(/^custom-/),
          title: "Examples",
          maxPoints: 4,
          description: "Includes a practical framework example.",
        },
      ],
    })
    expect(container.textContent).toContain("No rubric yet")
  })

  test("loads existing rubric values into edit mode, supports cancel, remove, and regenerate actions", () => {
    const onGenerate = jest.fn()
    const onUpdateRubric = jest.fn()

    act(() => {
      root.render(
        React.createElement(RubricCard, {
          question: createQuestion(),
          rubric: createRubric(),
          isGenerated: true,
          isLoading: false,
          onGenerate,
          onUpdateRubric,
          index: 0,
        }),
      )
    })

    expect(container.textContent).toContain("Concept accuracy")
    expect(container.textContent).toContain("Examples")

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Edit")) ?? null)

    const titleInputs = Array.from(
      container.querySelectorAll('input[placeholder*="Criterion title"]'),
    ) as HTMLInputElement[]
    expect(titleInputs.map((input) => input.value)).toEqual(["Concept accuracy", "Examples"])

    changeInput(titleInputs[0], "Changed title")
    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Cancel")) ?? null)

    expect(onUpdateRubric).not.toHaveBeenCalled()
    expect(container.textContent).toContain("Concept accuracy")
    expect(container.textContent).not.toContain("Changed title")

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Edit")) ?? null)
    click(container.querySelector('button[aria-label="Remove criterion 2"]'))
    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Save Rubric")) ?? null)

    expect(onUpdateRubric).toHaveBeenCalledWith({
      id: "rubric-1",
      questionTitle: "Question 1: Explain MVC",
      totalPoints: 5,
      criteria: [
        {
          id: "criterion-1",
          title: "Concept accuracy",
          maxPoints: 5,
          description: "Defines each MVC layer correctly.",
        },
      ],
    })

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Regenerate")) ?? null)
    expect(onGenerate).toHaveBeenCalledTimes(1)
  })
})
