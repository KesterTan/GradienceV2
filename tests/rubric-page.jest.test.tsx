import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { RubricPage } from "../components/rubric-page"
import { useGrading } from "@/lib/grading-context"

const mockButton = jest.fn((props: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => {
  const { children, ...rest } = props
  return <button {...rest}>{children}</button>
})

const mockRubricCard = jest.fn((props: any) => {
  return <div data-testid={`rubric-card-${props.question?.id || "unknown"}`} />
})

const mockAIChatPanel = jest.fn((_props?: any) => {
  return <div data-testid="ai-chat-panel" />
})

const mockPanelTabBar = jest.fn((_props?: any) => {
  return <div data-testid="panel-tab-bar" />
})

jest.mock("@/lib/grading-context", () => ({
  useGrading: jest.fn(),
}))

jest.mock("../components/submission-viewer", () => ({
  SubmissionViewer: () => <div data-testid="submission-viewer" />,
}))

jest.mock("../components/rubric-card", () => ({
  RubricCard: (props: any) => mockRubricCard(props),
}))

jest.mock("../components/ai-chat-panel", () => ({
  AIChatPanel: (props: any) => mockAIChatPanel(props),
}))

jest.mock("../components/panel-tab-bar", () => ({
  PanelTabBar: (props: any) => mockPanelTabBar(props),
}))

jest.mock("@/components/ui/button", () => ({
  Button: (props: any) => mockButton(props),
}))

jest.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}))

const mockUseGrading = useGrading as jest.Mock

function createGradingState(overrides: Partial<any> = {}) {
  return {
    selectedStudentId: "student-a",
    submissions: [
      {
        id: "student-a",
        name: "Student A",
        fileName: "submission-a.pdf",
        questions: [
          { id: "q1", title: "Question 1: Intro" },
          { id: "q2", title: "Question 2: Deep Dive" },
        ],
      },
    ],
    rubrics: {
      "student-a": [
        { id: "r1", questionTitle: "Intro" },
        { id: "r2", questionTitle: "Deep Dive" },
      ],
    },
    gradingResults: {},
    rubricGenerated: { "student-a": false },
    questionRubricGenerated: { "student-a": { q1: true, q2: false } },
    questionRubricLoading: { "student-a": { q1: false, q2: false } },
    gradingComplete: {},
    setPage: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    setSelectedStudent: jest.fn(),
    selectStudentAndNavigate: jest.fn(),
    generateAllRubrics: jest.fn(async () => {}),
    generateQuestionRubric: jest.fn(async () => {}),
    confirmRubric: jest.fn(),
    updateRubricOrder: jest.fn(),
    updateQuestionRubric: jest.fn(),
    ...overrides,
  }
}

function renderPage() {
  renderToStaticMarkup(<RubricPage />)
}

function extractText(value: React.ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value)
  if (Array.isArray(value)) return value.map(extractText).join("")
  if (React.isValidElement(value)) {
    const element = value as React.ReactElement<{ children?: React.ReactNode }>
    return extractText(element.props.children)
  }
  return ""
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUseGrading.mockImplementation(() => createGradingState())
})

afterEach(() => {
  jest.restoreAllMocks()
})

test("passes rubric data and generate handlers to RubricCard", () => {
  const gradingState = createGradingState()
  mockUseGrading.mockImplementation(() => gradingState)

  renderPage()

  expect(mockRubricCard).toHaveBeenCalledTimes(2)
  const firstProps = mockRubricCard.mock.calls[0][0]
  const secondProps = mockRubricCard.mock.calls[1][0]

  expect(firstProps.rubric?.id).toBe("r1")
  expect(secondProps.rubric?.id).toBe("r2")

  firstProps.onGenerate()
  expect(gradingState.generateQuestionRubric).toHaveBeenCalledWith("student-a", "q1")
})

test("builds chat references from questions and generated rubrics", () => {
  const gradingState = createGradingState()
  const setAllLoading = jest.fn()
  const setChatOpen = jest.fn()
  jest.spyOn(React, "useState")
    .mockImplementationOnce(() => [false, setAllLoading])
    .mockImplementationOnce(() => [true, setChatOpen])

  mockUseGrading.mockImplementation(() => gradingState)

  renderPage()

  expect(mockAIChatPanel).toHaveBeenCalledTimes(1)
  const aiChatCall = mockAIChatPanel.mock.calls[0]
  if (!aiChatCall) throw new Error("AIChatPanel was not called")
  const references = (aiChatCall[0] as { references: Array<{ id: string; label: string; type: string }> }).references

  expect(references).toEqual(
    expect.arrayContaining([
      { id: "q-q1", label: "Q1: Intro", type: "question" },
      { id: "q-q2", label: "Q2: Deep Dive", type: "question" },
      { id: "r-r1", label: "Rubric: Intro", type: "rubric" },
    ])
  )
})

test("Generate All button triggers generateAllRubrics", async () => {
  const gradingState = createGradingState()
  const setAllLoading = jest.fn()
  const setChatOpen = jest.fn()

  jest.spyOn(React, "useState")
    .mockImplementationOnce(() => [false, setAllLoading])
    .mockImplementationOnce(() => [false, setChatOpen])

  mockUseGrading.mockImplementation(() => gradingState)

  renderPage()

  const generateAllButtonCall = mockButton.mock.calls.find(([props]) => {
    const text = extractText(props.children)
    return text.includes("Generate All")
  })

  expect(generateAllButtonCall).toBeTruthy()
  if (!generateAllButtonCall) throw new Error("Generate All button not found")

  const generateAllProps = generateAllButtonCall[0]
  await generateAllProps.onClick?.({} as React.MouseEvent<HTMLButtonElement>)

  expect(setAllLoading).toHaveBeenCalledWith(true)
  expect(gradingState.generateAllRubrics).toHaveBeenCalledWith("student-a")
  expect(setAllLoading).toHaveBeenCalledWith(false)
})

test("Chat toggle button updates state", () => {
  const gradingState = createGradingState()
  const setAllLoading = jest.fn()
  const setChatOpen = jest.fn()

  jest.spyOn(React, "useState")
    .mockImplementationOnce(() => [false, setAllLoading])
    .mockImplementationOnce(() => [false, setChatOpen])

  mockUseGrading.mockImplementation(() => gradingState)

  renderPage()

  const toggleButtonCall = mockButton.mock.calls.find(([props]) => {
    const text = extractText(props.children)
    return text.includes("Open AI Chat")
  })

  expect(toggleButtonCall).toBeTruthy()
  if (!toggleButtonCall) throw new Error("Chat toggle button not found")

  const toggleProps = toggleButtonCall[0]
  toggleProps.onClick?.({} as React.MouseEvent<HTMLButtonElement>)

  expect(setChatOpen).toHaveBeenCalledTimes(1)
  expect(typeof setChatOpen.mock.calls[0][0]).toBe("function")
})
