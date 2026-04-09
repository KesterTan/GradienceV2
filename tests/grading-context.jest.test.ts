/** @jest-environment jsdom */
import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { GradingProvider, useGrading } from "../lib/grading-context"
import { mockGradingResults } from "../lib/mock-data"

jest.mock("../lib/mock-data", () => {
  const submissions = [
    {
      id: "student-a",
      name: "Student A",
      fileName: "submission-a.pdf",
      questions: [
        { id: "q1", title: "Question 1: Intro" },
        { id: "q2", title: "Question 2: Deep Dive" },
      ],
    },
    {
      id: "student-b",
      name: "Student B",
      fileName: "submission-b.pdf",
      questions: [{ id: "q3", title: "Question 3: Summary" }],
    },
  ]

  const rubrics = {
    "student-a": [
      { id: "r1", questionTitle: "Intro" },
      { id: "r2", questionTitle: "Deep Dive" },
    ],
    "student-b": [{ id: "r3", questionTitle: "Summary" }],
  }

  const gradingResults = {
    "student-a": [{ earnedPoints: 3, totalPoints: 5 }],
  }

  return {
    getSubmissions: () => submissions,
    mockRubrics: rubrics,
    mockGradingResults: gradingResults,
  }
})

type GradingContextValue = ReturnType<typeof useGrading>

let latestContext: GradingContextValue | null = null

class ErrorCatcher extends React.Component<
  { onError: (error: Error) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    return this.state.hasError ? null : this.props.children
  }
}

function CaptureContext() {
  latestContext = useGrading()
  return null
}

function renderProvider() {
  latestContext = null
  const container = document.createElement("div")
  const root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(GradingProvider, null, React.createElement(CaptureContext))
    )
  })
  return { root, container }
}

function getContext(): GradingContextValue {
  if (!latestContext) {
    throw new Error("Expected grading context to be available")
  }
  return latestContext
}

async function flushAllTimers() {
  await jest.runAllTimersAsync()
}

beforeAll(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  jest.useRealTimers()
})

test("useGrading throws outside provider", () => {
  let capturedError: Error | null = null
  const container = document.createElement("div")
  const root = createRoot(container)

  act(() => {
    root.render(
      React.createElement(
        ErrorCatcher,
        { onError: (error) => { capturedError = error } },
        React.createElement(CaptureContext)
      )
    )
  })

  expect(capturedError?.message).toBe("useGrading must be used within GradingProvider")
  act(() => {
    root.unmount()
  })
})

test("navigation stack updates with setPage/goBack/goForward", () => {
  const { root } = renderProvider()
  const ctx = getContext()

  expect(ctx.currentPage).toBe("home")
  expect(ctx.canGoBack).toBe(false)
  expect(ctx.canGoForward).toBe(false)

  act(() => {
    ctx.setPage("upload")
  })
  const ctxAfterSet = getContext()
  expect(ctxAfterSet.currentPage).toBe("upload")
  expect(ctxAfterSet.canGoBack).toBe(true)
  expect(ctxAfterSet.canGoForward).toBe(false)

  act(() => {
    ctxAfterSet.goBack()
  })
  expect(getContext().currentPage).toBe("home")

  act(() => {
    getContext().goForward()
  })
  expect(getContext().currentPage).toBe("upload")

  act(() => {
    root.unmount()
  })
})

test("selectStudentAndNavigate updates selection and page", () => {
  const { root } = renderProvider()
  act(() => {
    getContext().selectStudentAndNavigate("student-b")
  })

  const ctx = getContext()
  expect(ctx.selectedStudentId).toBe("student-b")
  expect(ctx.currentPage).toBe("upload")

  act(() => {
    root.unmount()
  })
})

test("generateAllRubrics populates rubrics and flags", async () => {
  jest.useFakeTimers()
  const { root } = renderProvider()

  await act(async () => {
    const promise = getContext().generateAllRubrics("student-a")
    await flushAllTimers()
    await promise
  })

  const ctx = getContext()
  expect(ctx.rubrics["student-a"]).toHaveLength(2)
  expect(ctx.questionRubricGenerated["student-a"]).toEqual({ q1: true, q2: true })
  expect(ctx.questionRubricLoading["student-a"]).toEqual({ q1: false, q2: false })
  expect(ctx.rubricGenerated["student-a"]).toBe(true)

  act(() => {
    root.unmount()
  })
})

test("generateQuestionRubric marks rubric generated when all questions complete", async () => {
  jest.useFakeTimers()
  const { root } = renderProvider()

  await act(async () => {
    const promise = getContext().generateQuestionRubric("student-a", "q1")
    await flushAllTimers()
    await promise
  })

  await act(async () => {
    const promise = getContext().generateQuestionRubric("student-a", "q2")
    await flushAllTimers()
    await promise
  })

  const ctx = getContext()
  expect(ctx.questionRubricGenerated["student-a"]).toEqual({ q1: true, q2: true })
  expect(ctx.rubricGenerated["student-a"]).toBe(true)

  act(() => {
    root.unmount()
  })
})

test("confirmRubric sets grading results and navigates", () => {
  const { root } = renderProvider()

  act(() => {
    getContext().confirmRubric("student-a")
  })

  const ctx = getContext()
  expect(ctx.gradingResults["student-a"]).toEqual(mockGradingResults["student-a"])
  expect(ctx.gradingComplete["student-a"]).toBe(true)
  expect(ctx.currentPage).toBe("grading")

  act(() => {
    root.unmount()
  })
})

test("updateRubricOrder and updateQuestionRubric update state", () => {
  const { root } = renderProvider()

  const newRubrics = [{ id: "r99", questionTitle: "Updated" }]
  act(() => {
    getContext().updateRubricOrder("student-a", newRubrics)
  })

  const ctxAfterOrder = getContext()
  expect(ctxAfterOrder.rubrics["student-a"]).toEqual(newRubrics)

  act(() => {
    getContext().updateQuestionRubric("student-a", "q1", { id: "r100", questionTitle: "Custom" } as any)
  })

  const ctxAfterUpdate = getContext()
  expect(ctxAfterUpdate.rubrics["student-a"]).toEqual(
    expect.arrayContaining([{ id: "r100", questionTitle: "Custom" }])
  )
  expect(ctxAfterUpdate.questionRubricGenerated["student-a"].q1).toBe(true)

  act(() => {
    root.unmount()
  })
})
