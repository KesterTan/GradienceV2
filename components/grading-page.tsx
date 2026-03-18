"use client"

import { useState, useCallback, useMemo } from "react"
import { useGrading } from "@/lib/grading-context"
import { SubmissionViewer } from "./submission-viewer"
import { AIChatPanel, type ChatReference } from "./ai-chat-panel"
import { PanelTabBar } from "./panel-tab-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
  Bot,
  Sparkles,
  Pencil,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { GradingResult } from "@/lib/mock-data"

function getScoreColor(earned: number, max: number) {
  const pct = (earned / max) * 100
  if (pct >= 90) return "text-emerald-600"
  if (pct >= 70) return "text-amber-600"
  return "text-red-600"
}

function getConfidenceColor(c: number) {
  if (c >= 90) return "bg-emerald-500"
  if (c >= 75) return "bg-amber-500"
  return "bg-red-500"
}

function GradingBreakdownContent({
  highlightedQ,
  setHighlightedQ,
  results,
  onUpdateResults,
}: {
  highlightedQ: string | undefined
  setHighlightedQ: (id: string | undefined) => void
  results: GradingResult[]
  onUpdateResults: (results: GradingResult[]) => void
}) {
  const totalEarned = results.reduce((s, r) => s + r.earnedPoints, 0)
  const totalMax = results.reduce((s, r) => s + r.totalPoints, 0)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editScores, setEditScores] = useState<Record<string, number>>({})

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const startEditing = (result: GradingResult) => {
    const scores: Record<string, number> = {}
    result.criteriaResults.forEach((cr) => {
      scores[cr.criterionId] = cr.earnedPoints
    })
    setEditScores(scores)
    setEditingQuestion(result.questionId)
  }

  const cancelEditing = () => {
    setEditingQuestion(null)
    setEditScores({})
  }

  const saveEditing = (questionId: string) => {
    const updated = results.map((r) => {
      if (r.questionId !== questionId) return r
      const newCriteria = r.criteriaResults.map((cr) => ({
        ...cr,
        earnedPoints: Math.min(
          Math.max(0, editScores[cr.criterionId] ?? cr.earnedPoints),
          cr.maxPoints
        ),
      }))
      const newTotal = newCriteria.reduce((s, cr) => s + cr.earnedPoints, 0)
      return {
        ...r,
        criteriaResults: newCriteria,
        earnedPoints: newTotal,
      }
    })
    onUpdateResults(updated)
    setEditingQuestion(null)
    setEditScores({})
  }

  return (
    <div className="flex h-full flex-col">
      {/* Score summary bar */}
      {results.length > 0 && (
        <div className="flex items-center justify-between border-b px-4 py-2.5 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-md bg-primary/10 p-1.5">
              <BarChart3 className="size-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Score</p>
              <p className={cn("text-sm font-bold", getScoreColor(totalEarned, totalMax))}>
                {totalEarned}/{totalMax}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={(totalEarned / totalMax) * 100} className="h-1.5 w-24" />
            <span className="text-xs font-medium text-muted-foreground">
              {Math.round((totalEarned / totalMax) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Scrollable results */}
      <div className="flex-1 overflow-y-auto scroll-smooth bg-muted/30">
        <div className="space-y-3 p-4 pb-8">
          {results.map((result) => {
            const isOpen = openSections[result.questionId] !== false
            const isEditing = editingQuestion === result.questionId
            return (
              <Collapsible
                key={result.questionId}
                open={isOpen}
                onOpenChange={() => toggleSection(result.questionId)}
              >
                <div
                  className={cn(
                    "overflow-hidden rounded-lg border bg-white transition-all",
                    isEditing ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:shadow-sm"
                  )}
                  onMouseEnter={() => setHighlightedQ(result.questionId)}
                  onMouseLeave={() => setHighlightedQ(undefined)}
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">
                        {result.questionTitle}
                      </h4>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <span className={cn("text-sm font-bold", getScoreColor(result.earnedPoints, result.totalPoints))}>
                          {result.earnedPoints}/{result.totalPoints}
                        </span>
                        <Progress
                          value={(result.earnedPoints / result.totalPoints) * 100}
                          className="h-1 flex-1 max-w-24"
                        />
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t">
                      <div className="divide-y">
                        {result.criteriaResults.map((cr) => (
                          <div key={cr.criterionId} className="px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {cr.earnedPoints === cr.maxPoints ? (
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="size-3.5 text-amber-500" />
                                )}
                                <span className="text-xs font-medium text-foreground">
                                  {cr.criterionTitle}
                                </span>
                              </div>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={cr.maxPoints}
                                    value={editScores[cr.criterionId] ?? cr.earnedPoints}
                                    onChange={(e) =>
                                      setEditScores((prev) => ({
                                        ...prev,
                                        [cr.criterionId]: Math.min(
                                          Math.max(0, parseInt(e.target.value) || 0),
                                          cr.maxPoints
                                        ),
                                      }))
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-12 rounded border bg-white px-1.5 py-0.5 text-center text-xs font-semibold text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                                    aria-label={`Score for ${cr.criterionTitle}`}
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    /{cr.maxPoints}
                                  </span>
                                </div>
                              ) : (
                                <span className={cn("text-xs font-semibold", getScoreColor(cr.earnedPoints, cr.maxPoints))}>
                                  {cr.earnedPoints}/{cr.maxPoints}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 pl-5 text-[11px] leading-relaxed text-muted-foreground">
                              {cr.feedback}
                            </p>
                            <div className="mt-1.5 flex items-center gap-1.5 pl-5">
                              <div className={cn("size-1.5 rounded-full", getConfidenceColor(cr.confidence))} />
                              <span className="text-[10px] text-muted-foreground">
                                {cr.confidence}% confidence
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Overall feedback + edit controls */}
                      <div className="border-t bg-muted/30 px-4 py-2.5">
                        <p className="text-[11px] font-medium text-foreground/70">Overall Feedback</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                          {result.overallFeedback}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 border-t px-4 py-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEditing()
                              }}
                            >
                              <X className="size-3" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 gap-1.5 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                saveEditing(result.questionId)
                              }}
                            >
                              <Check className="size-3" />
                              Save
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(result)
                            }}
                          >
                            <Pencil className="size-3" />
                            Edit Score
                          </Button>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function GradingPage() {
  const { selectedStudentId, gradingResults, submissions, rubrics, questionRubricGenerated } = useGrading()
  const [highlightedQ, setHighlightedQ] = useState<string | undefined>()
  const [localResults, setLocalResults] = useState<GradingResult[] | null>(null)

  const serverResults = gradingResults[selectedStudentId] || []
  const results = localResults ?? serverResults

  // Sync from server when student changes
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

  const [chatOpen, setChatOpen] = useState(false)

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev)
  }, [])

  const totalEarned = results.reduce((s, r) => s + r.earnedPoints, 0)
  const totalMax = results.reduce((s, r) => s + r.totalPoints, 0)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-2.5">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            {student?.name} &mdash; Grading Results
          </h1>
          {results.length > 0 && (
            <Badge variant="secondary" className="text-xs font-medium">
              {totalEarned}/{totalMax} pts
            </Badge>
          )}
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
          <Sparkles className="size-3.5" />
          {chatOpen ? "Hide AI Chat" : "Open AI Chat"}
        </Button>
      </div>

      {/* Fixed 2 or 3 panel layout */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Panel 1: Submission (fixed) */}
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
                <SubmissionViewer highlightedQuestionId={highlightedQ} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Panel 2: Grading (fixed) */}
          <ResizablePanel defaultSize={chatOpen ? 34 : 50} minSize={20}>
            <div className="flex h-full flex-col overflow-hidden">
              <PanelTabBar
                tabs={[{
                  id: "grading",
                  label: "Grading",
                  icon: <BarChart3 className="size-3.5" />,
                  closable: false,
                }]}
                activeTab="grading"
                onTabChange={() => {}}
              />
              <div className="flex-1 overflow-hidden" role="tabpanel" aria-label="Grading">
                <GradingBreakdownContent
                  highlightedQ={highlightedQ}
                  setHighlightedQ={setHighlightedQ}
                  results={results}
                  onUpdateResults={setLocalResults}
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
