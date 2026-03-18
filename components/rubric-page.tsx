"use client"

import { useState, useCallback, useMemo } from "react"
import { useGrading } from "@/lib/grading-context"
import { SubmissionViewer } from "./submission-viewer"
import { RubricCard } from "./rubric-card"
import { AIChatPanel, type ChatReference } from "./ai-chat-panel"
import { PanelTabBar } from "./panel-tab-bar"
import { Button } from "@/components/ui/button"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Wand2,
  FileText,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"

function RubricPanelContent({
  allLoading,
  handleGenerateAll,
}: {
  allLoading: boolean
  handleGenerateAll: () => void
}) {
  const {
    selectedStudentId,
    submissions,
    rubrics,
    rubricGenerated,
    questionRubricGenerated,
    questionRubricLoading,
    generateQuestionRubric,
    confirmRubric,
    updateQuestionRubric,
  } = useGrading()

  const student = submissions.find((s) => s.id === selectedStudentId)
  const currentRubrics = rubrics[selectedStudentId] || []
  const isFullyGenerated = rubricGenerated[selectedStudentId] || false
  const qGenerated = questionRubricGenerated[selectedStudentId] || {}
  const qLoading = questionRubricLoading[selectedStudentId] || {}
  const anyLoading = Object.values(qLoading).some(Boolean)
  const anyGenerated = Object.values(qGenerated).some(Boolean)
  const allQuestionsHaveRubrics = student
    ? student.questions.every((q) => qGenerated[q.id])
    : false

  const handleGenerateQuestion = useCallback(
    (questionId: string) => {
      generateQuestionRubric(selectedStudentId, questionId)
    },
    [selectedStudentId, generateQuestionRubric]
  )

  const getRubricForQuestion = (questionId: string) => {
    if (!student) return null
    const qIndex = student.questions.findIndex((q) => q.id === questionId)
    return currentRubrics[qIndex] || null
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2.5 bg-white">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Rubric Criteria</span>
          {student && (
            <span className="text-[10px] text-muted-foreground">
              {student.questions.length} questions
              {anyGenerated && (
                <> &middot; {Object.values(qGenerated).filter(Boolean).length} with rubrics</>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!isFullyGenerated && (
            <Button
              onClick={handleGenerateAll}
              disabled={allLoading || anyLoading}
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-xs"
            >
              {allLoading || anyLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Wand2 className="size-3" />
              )}
              Generate All
            </Button>
          )}
          {allQuestionsHaveRubrics && (
            <Button
              onClick={() => confirmRubric(selectedStudentId)}
              size="sm"
              className="gap-1.5 h-7 text-xs"
            >
              <CheckCircle2 className="size-3" />
              Confirm & Grade
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-smooth bg-muted/30">
        <div className="p-4 space-y-3 pb-8">
          {student?.questions.map((question, i) => (
            <RubricCard
              key={question.id}
              question={question}
              rubric={getRubricForQuestion(question.id)}
              isGenerated={!!qGenerated[question.id]}
              isLoading={!!qLoading[question.id]}
              onGenerate={() => handleGenerateQuestion(question.id)}
              onUpdateRubric={(rubric) =>
                updateQuestionRubric(selectedStudentId, question.id, rubric)
              }
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function RubricPage() {
  const {
    selectedStudentId,
    submissions,
    rubrics,
    questionRubricGenerated,
    generateAllRubrics,
  } = useGrading()

  const [allLoading, setAllLoading] = useState(false)
  const student = submissions.find((s) => s.id === selectedStudentId)
  const currentRubrics = rubrics[selectedStudentId] || []
  const qGenerated = questionRubricGenerated[selectedStudentId] || {}

  const chatReferences = useMemo<ChatReference[]>(() => {
    if (!student) return []
    const refs: ChatReference[] = []
    student.questions.forEach((q, i) => {
      refs.push({ id: `q-${q.id}`, label: `Q${i + 1}: ${q.title.replace(/^Question \d+:\s*/, "")}`, type: "question" })
    })
    currentRubrics.forEach((r, i) => {
      if (qGenerated[student.questions[i]?.id]) {
        refs.push({ id: `r-${r.id}`, label: `Rubric: ${r.questionTitle}`, type: "rubric" })
      }
    })
    return refs
  }, [student, currentRubrics, qGenerated])

  const handleGenerateAll = async () => {
    setAllLoading(true)
    await generateAllRubrics(selectedStudentId)
    setAllLoading(false)
  }

  const [chatOpen, setChatOpen] = useState(false)

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev)
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-2.5">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            {student?.name} &mdash; Rubric Generation
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Generate or write rubrics for each question
          </p>
        </div>
        <Button
          onClick={toggleChat}
          className={cn(
            "h-8 gap-1.5 text-xs font-semibold transition-all",
            chatOpen
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              : "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 hover:bg-primary/90"
          )}
          aria-label={chatOpen ? "Close AI chat" : "Open AI chat"}
        >
          <Bot className="size-3.5" />
          {chatOpen ? "Hide AI Chat" : "Open AI Chat"}
        </Button>
      </div>

      {/* Fixed 2 or 3 panel layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Panel 1: Submission (always visible, fixed tab) */}
          <ResizablePanel defaultSize={chatOpen ? 33 : 50} minSize={20}>
            <div className="flex h-full flex-col overflow-hidden">
              <PanelTabBar
                tabs={[{
                  id: "submission",
                  label: "Submission",
                  icon: <FileText className="size-3.5" />,
                  closable: false,
                }]}
                activeTab="submission"
                onTabChange={() => {}}
              />
              <div className="flex-1 overflow-hidden" role="tabpanel" aria-label="Submission">
                <SubmissionViewer />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel 2: Rubric (always visible, fixed tab) */}
          <ResizablePanel defaultSize={chatOpen ? 34 : 50} minSize={20}>
            <div className="flex h-full flex-col overflow-hidden">
              <PanelTabBar
                tabs={[{
                  id: "rubric",
                  label: "Rubric",
                  icon: <Sparkles className="size-3.5" />,
                  closable: false,
                }]}
                activeTab="rubric"
                onTabChange={() => {}}
              />
              <div className="flex-1 overflow-hidden" role="tabpanel" aria-label="Rubric">
                <RubricPanelContent
                  allLoading={allLoading}
                  handleGenerateAll={handleGenerateAll}
                />
              </div>
            </div>
          </ResizablePanel>

          {/* Panel 3: AI Chat (conditionally visible, closable) */}
          {chatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={33} minSize={20}>
                <div className="flex h-full flex-col overflow-hidden">
                  <PanelTabBar
                    tabs={[{
                      id: "chat",
                      label: "AI Chat",
                      icon: <Bot className="size-3.5" />,
                      closable: true,
                    }]}
                    activeTab="chat"
                    onTabChange={() => {}}
                    onTabClose={() => setChatOpen(false)}
                  />
                  <div className="flex-1 overflow-hidden" role="tabpanel" aria-label="AI Chat">
                    <AIChatPanel references={chatReferences} />
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}
