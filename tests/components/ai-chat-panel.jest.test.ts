/** @jest-environment jsdom */

import React, { act } from "react"
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals"
import { createRoot, type Root } from "react-dom/client"

const { AIChatPanel } = require("@/components/ai-chat-panel") as typeof import("@/components/ai-chat-panel")

globalThis.IS_REACT_ACT_ENVIRONMENT = true

function click(element: Element | null) {
  if (!element) {
    throw new Error("Expected element to exist before clicking")
  }

  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  })
}

function changeInput(element: HTMLInputElement, value: string) {
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    setter?.call(element, value)
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  })
}

function keyDownEnter(element: HTMLInputElement) {
  act(() => {
    element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }))
  })
}

function ensureReferencePickerOpen(container: HTMLDivElement) {
  if (container.querySelector('[role="listbox"]')) {
    return
  }

  click(Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Add reference"),
  ) ?? null)
}

describe("AIChatPanel", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    document.body.innerHTML = ""
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
    HTMLElement.prototype.scrollIntoView = jest.fn()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
  })

  test("opens the reference picker, selects and clears references, and closes when clicking outside", () => {
    const references = [
      { id: "q-1", label: "Q1: MVC layers", type: "question" as const },
      { id: "r-1", label: "Rubric: MVC accuracy", type: "rubric" as const },
    ]

    act(() => {
      root.render(React.createElement(AIChatPanel, { references }))
    })

    ensureReferencePickerOpen(container)

    expect(container.textContent).toContain("Questions")
    expect(container.textContent).toContain("Rubrics")

    click(Array.from(container.querySelectorAll('button[role="option"]')).find((button) =>
      button.textContent?.includes("Q1: MVC layers"),
    ) ?? null)

    expect(container.textContent).toContain("Context:")
    expect(container.textContent).toContain("Q1: MVC layers")
    expect(container.textContent).toContain("1 referenced")
    expect((container.querySelector('input[aria-label="Chat message input"]') as HTMLInputElement).placeholder).toBe(
      "Ask about the selected references...",
    )

    act(() => {
      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
    })
    expect(container.querySelector('[role="listbox"]')).toBeNull()

    click(Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Clear all")) ?? null)
    expect(container.textContent).not.toContain("Context:")
    expect(container.textContent).toContain("Add reference")
  })

  test("removes individual references and sends chat messages with and without selected context", () => {
    const references = [
      { id: "q-1", label: "Q1: MVC layers", type: "question" as const },
      { id: "r-1", label: "Rubric: MVC accuracy", type: "rubric" as const },
    ]

    act(() => {
      root.render(React.createElement(AIChatPanel, { references }))
    })

    ensureReferencePickerOpen(container)
    click(Array.from(container.querySelectorAll('button[role="option"]')).find((button) =>
      button.textContent?.includes("Q1: MVC layers"),
    ) ?? null)

    click(container.querySelector('button[aria-label="Remove Q1: MVC layers from context"]'))
    expect(container.textContent).not.toContain("Context:")

    const input = container.querySelector('input[aria-label="Chat message input"]') as HTMLInputElement
    changeInput(input, "How was this graded?")
    click(container.querySelector('button[aria-label="Send message"]'))

    expect(container.textContent).toContain("How was this graded?")
    expect(container.textContent).toContain("I understand your question.")

    ensureReferencePickerOpen(container)
    click(Array.from(container.querySelectorAll('button[role="option"]')).find((button) =>
      button.textContent?.includes("Rubric: MVC accuracy"),
    ) ?? null)

    changeInput(input, "Explain the rubric choice")
    keyDownEnter(input)

    expect(container.textContent).toContain("[Referencing: Rubric: MVC accuracy] Explain the rubric choice")
    expect(container.textContent).toContain("Regarding Rubric: MVC accuracy")
  })
})
