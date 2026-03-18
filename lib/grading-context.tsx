"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import {
  type StudentSubmission,
  type QuestionRubric,
  type GradingResult,
  getSubmissions,
  mockRubrics,
  mockGradingResults,
} from "./mock-data"

type Page = "home" | "upload" | "rubric" | "grading"

interface GradingState {
  currentPage: Page
  selectedStudentId: string
  submissions: StudentSubmission[]
  rubrics: Record<string, QuestionRubric[]>
  gradingResults: Record<string, GradingResult[]>
  rubricGenerated: Record<string, boolean>
  questionRubricGenerated: Record<string, Record<string, boolean>>
  questionRubricLoading: Record<string, Record<string, boolean>>
  gradingComplete: Record<string, boolean>
  canGoBack: boolean
  canGoForward: boolean
  setPage: (page: Page) => void
  goBack: () => void
  goForward: () => void
  setSelectedStudent: (id: string) => void
  selectStudentAndNavigate: (id: string) => void
  generateAllRubrics: (studentId: string) => Promise<void>
  generateQuestionRubric: (studentId: string, questionId: string) => Promise<void>
  confirmRubric: (studentId: string) => void
  updateRubricOrder: (studentId: string, rubrics: QuestionRubric[]) => void
  updateQuestionRubric: (studentId: string, questionId: string, rubric: QuestionRubric) => void
}

const GradingContext = createContext<GradingState | null>(null)

export function GradingProvider({ children }: { children: ReactNode }) {
  const [navigation, setNavigation] = useState<{ stack: Page[]; index: number }>({
    stack: ["home"],
    index: 0,
  })
  const [selectedStudentId, setSelectedStudentId] = useState("student-a")
  const [rubrics, setRubrics] = useState<Record<string, QuestionRubric[]>>({})
  const [gradingResults, setGradingResults] = useState<Record<string, GradingResult[]>>({})
  const [rubricGenerated, setRubricGenerated] = useState<Record<string, boolean>>({})
  const [questionRubricGenerated, setQuestionRubricGenerated] = useState<Record<string, Record<string, boolean>>>({})
  const [questionRubricLoading, setQuestionRubricLoading] = useState<Record<string, Record<string, boolean>>>({})
  const [gradingComplete, setGradingComplete] = useState<Record<string, boolean>>({})

  const submissions = getSubmissions()

  const currentPage = navigation.stack[navigation.index]
  const canGoBack = navigation.index > 0
  const canGoForward = navigation.index < navigation.stack.length - 1

  const navigateTo = useCallback((page: Page) => {
    setNavigation((prev) => {
      const current = prev.stack[prev.index]
      if (current === page) return prev

      const nextStack = [...prev.stack.slice(0, prev.index + 1), page]
      return { stack: nextStack, index: nextStack.length - 1 }
    })
  }, [])

  const setPage = useCallback((page: Page) => {
    navigateTo(page)
  }, [navigateTo])

  const goBack = useCallback(() => {
    setNavigation((prev) => {
      if (prev.index === 0) return prev
      return { ...prev, index: prev.index - 1 }
    })
  }, [])

  const goForward = useCallback(() => {
    setNavigation((prev) => {
      if (prev.index >= prev.stack.length - 1) return prev
      return { ...prev, index: prev.index + 1 }
    })
  }, [])

  const setSelectedStudent = useCallback((id: string) => {
    setSelectedStudentId(id)
  }, [])

  const selectStudentAndNavigate = useCallback((id: string) => {
    setSelectedStudentId(id)
    navigateTo("upload")
  }, [navigateTo])

  const generateAllRubrics = useCallback(async (studentId: string) => {
    const allMockRubrics = mockRubrics[studentId] || []
    const student = getSubmissions().find((s) => s.id === studentId)
    if (!student) return

    const loadingState: Record<string, boolean> = {}
    student.questions.forEach((q) => { loadingState[q.id] = true })
    setQuestionRubricLoading((prev) => ({ ...prev, [studentId]: loadingState }))

    for (let i = 0; i < student.questions.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600))
      const qId = student.questions[i].id
      const matchedRubric = allMockRubrics[i]
      if (matchedRubric) {
        setRubrics((prev) => {
          const existing = prev[studentId] || []
          const idx = existing.findIndex((r) => r.id === matchedRubric.id)
          if (idx >= 0) {
            const updated = [...existing]
            updated[idx] = matchedRubric
            return { ...prev, [studentId]: updated }
          }
          return { ...prev, [studentId]: [...existing, matchedRubric] }
        })
      }
      setQuestionRubricGenerated((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [qId]: true },
      }))
      setQuestionRubricLoading((prev) => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [qId]: false },
      }))
    }

    setRubricGenerated((prev) => ({ ...prev, [studentId]: true }))
  }, [])

  const generateQuestionRubric = useCallback(async (studentId: string, questionId: string) => {
    setQuestionRubricLoading((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [questionId]: true },
    }))

    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800))

    const allMockRubrics = mockRubrics[studentId] || []
    const student = getSubmissions().find((s) => s.id === studentId)
    if (!student) return

    const questionIndex = student.questions.findIndex((q) => q.id === questionId)
    const matchedRubric = allMockRubrics[questionIndex]

    if (matchedRubric) {
      setRubrics((prev) => {
        const existing = prev[studentId] || []
        const idx = existing.findIndex((r) => r.id === matchedRubric.id)
        if (idx >= 0) {
          const updated = [...existing]
          updated[idx] = matchedRubric
          return { ...prev, [studentId]: updated }
        }
        return { ...prev, [studentId]: [...existing, matchedRubric] }
      })
    }

    setQuestionRubricGenerated((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [questionId]: true },
    }))
    setQuestionRubricLoading((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [questionId]: false },
    }))

    const genState = { ...(questionRubricGenerated[studentId] || {}), [questionId]: true }
    const allDone = student.questions.every((q) => genState[q.id])
    if (allDone) {
      setRubricGenerated((prev) => ({ ...prev, [studentId]: true }))
    }
  }, [questionRubricGenerated])

  const confirmRubric = useCallback((studentId: string) => {
    setGradingResults((prev) => ({
      ...prev,
      [studentId]: mockGradingResults[studentId] || [],
    }))
    setGradingComplete((prev) => ({ ...prev, [studentId]: true }))
    navigateTo("grading")
  }, [navigateTo])

  const updateRubricOrder = useCallback((studentId: string, newRubrics: QuestionRubric[]) => {
    setRubrics((prev) => ({
      ...prev,
      [studentId]: newRubrics,
    }))
  }, [])

  const updateQuestionRubric = useCallback((studentId: string, questionId: string, rubric: QuestionRubric) => {
    setRubrics((prev) => {
      const existing = prev[studentId] || []
      const idx = existing.findIndex((r) => r.id === rubric.id)
      if (idx >= 0) {
        const updated = [...existing]
        updated[idx] = rubric
        return { ...prev, [studentId]: updated }
      }
      return { ...prev, [studentId]: [...existing, rubric] }
    })
    setQuestionRubricGenerated((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [questionId]: true },
    }))
  }, [])

  return (
    <GradingContext.Provider
      value={{
        currentPage,
        selectedStudentId,
        submissions,
        rubrics,
        gradingResults,
        rubricGenerated,
        questionRubricGenerated,
        questionRubricLoading,
        gradingComplete,
        canGoBack,
        canGoForward,
        setPage,
        goBack,
        goForward,
        setSelectedStudent,
        selectStudentAndNavigate,
        generateAllRubrics,
        generateQuestionRubric,
        confirmRubric,
        updateRubricOrder,
        updateQuestionRubric,
      }}
    >
      {children}
    </GradingContext.Provider>
  )
}

export function useGrading() {
  const ctx = useContext(GradingContext)
  if (!ctx) throw new Error("useGrading must be used within GradingProvider")
  return ctx
}
