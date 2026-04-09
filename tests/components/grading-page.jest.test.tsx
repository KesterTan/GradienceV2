/** @jest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/react";
import { GradingPage } from "@/components/grading-page";
import { GradingProvider, useGrading } from "@/lib/grading-context";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

// Mock scrollIntoView to prevent errors in the Jest environment
window.HTMLElement.prototype.scrollIntoView = jest.fn();

jest.mock("@/lib/grading-context", () => ({
  __esModule: true,
  useGrading: jest.fn(),
  GradingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("GradingPage", () => {
  const mockResults = [
    {
      questionId: "q1",
      questionTitle: "Question 1",
      earnedPoints: 8,
      totalPoints: 10,
      criteriaResults: [
        {
          criterionId: "c1",
          criterionTitle: "Criterion 1",
          earnedPoints: 4,
          maxPoints: 5,
          feedback: "Solid explanation with room for more detail.",
          confidence: 80,
        },
        {
          criterionId: "c2",
          criterionTitle: "Criterion 2",
          earnedPoints: 4,
          maxPoints: 5,
          feedback: "Good coverage of the main idea.",
          confidence: 82,
        },
      ],
      overallFeedback: "Strong answer with minor gaps.",
      highlightedRanges: [],
    },
  ];
  const mockSubmissions = [
    {
      id: "student-a",
      name: "Student A",
      questions: [
        { id: "q1", title: "Question 1" },
      ],
    },
  ];

  const mockRubrics = {
    "student-a": [
      { id: "rubric-1", title: "Rubric 1" },
    ],
  };

  const mockQuestionRubricGenerated = {
    "student-a": {
      "rubric-1": true,
    },
  };

  const mockGradingProviderValues = {
    currentPage: "home",
    selectedStudentId: "student-a",
    submissions: mockSubmissions,
    rubrics: mockRubrics,
    gradingResults: { "student-a": mockResults },
    rubricGenerated: {},
    questionRubricGenerated: {},
    questionRubricLoading: {},
    gradingComplete: {},
    canGoBack: false,
    canGoForward: false,
    setPage: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    setSelectedStudent: jest.fn(),
    selectStudentAndNavigate: jest.fn(),
    generateAllRubrics: jest.fn(),
    generateQuestionRubric: jest.fn(),
    confirmRubric: jest.fn(),
    updateRubricOrder: jest.fn(),
    updateQuestionRubric: jest.fn(),
  };

  beforeEach(() => {
    (useGrading as jest.Mock).mockReturnValue(mockGradingProviderValues);
  });

  // Wrap the GradingPage component with GradingProvider in tests
  const renderWithProvider = (ui: React.ReactElement) => {
    return render(<GradingProvider>{ui}</GradingProvider>);
  };

  it("renders the grading page with student name and total points", () => {
    renderWithProvider(<GradingPage />);

    // Check if student name is rendered
    expect(screen.getByText("Student A — Grading Results")).toBeInTheDocument();

    // Check if total points are displayed
    expect(screen.getByText("8/10 pts")).toBeInTheDocument();
  });

  it("toggles the AI chat panel when the button is clicked", () => {
    renderWithProvider(<GradingPage />);

    const toggleButton = screen.getByLabelText("Open AI chat");
    expect(toggleButton).toBeInTheDocument();

    // Click to open AI chat
    fireEvent.click(toggleButton);
    expect(screen.getByLabelText("Close AI chat")).toBeInTheDocument();

    // Click to close AI chat
    fireEvent.click(screen.getByLabelText("Close AI chat"));
    expect(screen.getByLabelText("Open AI chat")).toBeInTheDocument();
  });

  it("renders grading breakdown content correctly", () => {
    renderWithProvider(<GradingPage />);

    const scoreElements = screen.getAllByText("8/10");
    expect(scoreElements.length).toBeGreaterThan(0);

    const percentage = screen.getByText("80%");
    expect(percentage).toBeInTheDocument();
  });

  it("toggles section visibility when clicked", () => {
    renderWithProvider(<GradingPage />);

    const questionToggle = screen.getByRole("button", { name: /Question 1/ });
    expect(questionToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(questionToggle);
    expect(questionToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(questionToggle);
    expect(questionToggle).toHaveAttribute("aria-expanded", "false");
  });

  it("handles editing scores correctly", () => {
    renderWithProvider(<GradingPage />);

    const editButton = screen.getByRole("button", { name: /edit score/i });
    fireEvent.click(editButton);

    const scoreInput = screen.getByLabelText("Score for Criterion 1");
    fireEvent.change(scoreInput, { target: { value: "5" } });

    const saveButton = screen.getByRole("button", { name: /save/i });
    fireEvent.click(saveButton);

    expect(screen.getByText("5/5")).toBeInTheDocument();
    expect(screen.getAllByText("9/10").length).toBeGreaterThan(0);
  });

  it("applies correct styles based on score percentage", () => {
    renderWithProvider(<GradingPage />);

    const scoreElements = screen.getAllByText("8/10");
    expect(scoreElements.length).toBeGreaterThan(0);
    expect(scoreElements[0]).toHaveClass("text-amber-600");
  });

  it("toggles CollapsibleContent visibility based on open prop", () => {
    render(
      <Collapsible open={true}>
        <CollapsibleContent>Visible Content</CollapsibleContent>
      </Collapsible>
    );

    // Check if content is visible when open is true
    expect(screen.getByText("Visible Content")).toBeInTheDocument();

    render(
      <Collapsible open={false}>
        <CollapsibleContent>Hidden Content</CollapsibleContent>
      </Collapsible>
    );

    // Check if content is not rendered when open is false
    expect(screen.queryByText("Hidden Content")).toBeNull();
  });
});