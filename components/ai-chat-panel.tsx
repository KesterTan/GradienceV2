"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Bot, User, X, Hash, BookOpen } from "lucide-react"
import { mockChatMessages, type ChatMessage } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface ChatReference {
  id: string
  label: string
  type: "question" | "rubric"
}

interface AIChatPanelProps {
  references?: ChatReference[]
  className?: string
}

export function AIChatPanel({ references = [], className }: AIChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages)
  const [input, setInput] = useState("")
  const [selectedRefs, setSelectedRefs] = useState<string[]>([])
  const [refPickerOpen, setRefPickerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setRefPickerOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleRef = useCallback((refId: string) => {
    setSelectedRefs((prev) =>
      prev.includes(refId) ? prev.filter((r) => r !== refId) : [...prev, refId]
    )
  }, [])

  const removeRef = useCallback((refId: string) => {
    setSelectedRefs((prev) => prev.filter((r) => r !== refId))
  }, [])

  const clearAllRefs = useCallback(() => {
    setSelectedRefs([])
  }, [])

  const handleSend = () => {
    if (!input.trim()) return

    const refLabels = selectedRefs
      .map((id) => references.find((r) => r.id === id)?.label)
      .filter(Boolean)

    const contextPrefix =
      refLabels.length > 0
        ? `[Referencing: ${refLabels.join(", ")}] `
        : ""

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: `${contextPrefix}${input.trim()}`,
    }

    const aiContent =
      refLabels.length > 0
        ? `Regarding ${refLabels.join(" and ")}: Based on the rubric criteria, the scoring reflects the depth and accuracy of the response. The points were allocated proportionally to each criterion's weight. Would you like me to elaborate on any specific criterion or suggest adjustments?`
        : "I understand your question. Based on the submission analysis, the rubric criteria were calibrated to reflect the depth and accuracy of each response. The weighting accounts for both conceptual understanding and practical application. Let me know if you'd like me to adjust any specific criterion."

    const aiResponse: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: "ai",
      content: aiContent,
    }

    setMessages((prev) => [...prev, userMsg, aiResponse])
    setInput("")
  }

  const selectedRefObjects = selectedRefs
    .map((id) => references.find((r) => r.id === id))
    .filter(Boolean) as ChatReference[]

  const questionRefs = references.filter((r) => r.type === "question")
  const rubricRefs = references.filter((r) => r.type === "rubric")

  return (
    <div className={cn("flex h-full flex-col bg-zinc-950", className)}>
      {/* Selected references bar */}
      {selectedRefObjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-800 px-3 py-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 mr-1">
            Context:
          </span>
          {selectedRefObjects.map((ref) => (
            <Badge
              key={ref.id}
              variant="outline"
              className="gap-1 border-zinc-700 bg-zinc-900 text-[10px] text-zinc-300 hover:bg-zinc-800"
            >
              {ref.type === "question" ? (
                <Hash className="size-2.5 text-primary/70" />
              ) : (
                <BookOpen className="size-2.5 text-amber-500/70" />
              )}
              <span className="max-w-24 truncate">{ref.label}</span>
              <button
                onClick={() => removeRef(ref.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-700 transition-colors"
                aria-label={`Remove ${ref.label} from context`}
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
          <button
            onClick={clearAllRefs}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5",
                msg.role === "user" ? "flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  msg.role === "ai"
                    ? "bg-primary/20 text-primary"
                    : "bg-zinc-700 text-zinc-300"
                )}
              >
                {msg.role === "ai" ? (
                  <Bot className="size-3" />
                ) : (
                  <User className="size-3" />
                )}
              </div>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-xs leading-relaxed max-w-[85%]",
                  msg.role === "ai"
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-zinc-800 p-3 space-y-2">
        {/* Reference picker */}
        {references.length > 0 && (
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setRefPickerOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors",
                selectedRefs.length > 0
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
              aria-haspopup="listbox"
              aria-expanded={refPickerOpen}
            >
              <Hash className="size-3" />
              {selectedRefs.length > 0
                ? `${selectedRefs.length} referenced`
                : "Add reference"}
            </button>

            {refPickerOpen && (
              <div
                className="absolute bottom-full left-0 z-30 mb-1.5 w-72 max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl"
                role="listbox"
                aria-label="Select questions or rubrics to reference"
                aria-multiselectable="true"
              >
                {questionRefs.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-zinc-800">
                      Questions
                    </div>
                    {questionRefs.map((ref) => {
                      const isSelected = selectedRefs.includes(ref.id)
                      return (
                        <button
                          key={ref.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleRef(ref.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                            isSelected
                              ? "bg-primary/15 text-primary"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-zinc-600 bg-zinc-800"
                            )}
                          >
                            {isSelected && (
                              <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <Hash className="size-3 shrink-0 text-zinc-600" />
                          <span className="truncate">{ref.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                {rubricRefs.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-zinc-800">
                      Rubrics
                    </div>
                    {rubricRefs.map((ref) => {
                      const isSelected = selectedRefs.includes(ref.id)
                      return (
                        <button
                          key={ref.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => toggleRef(ref.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                            isSelected
                              ? "bg-amber-500/15 text-amber-400"
                              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                          )}
                        >
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                              isSelected
                                ? "border-amber-500 bg-amber-500 text-white"
                                : "border-zinc-600 bg-zinc-800"
                            )}
                          >
                            {isSelected && (
                              <svg className="size-2.5" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <BookOpen className="size-3 shrink-0 text-zinc-600" />
                          <span className="truncate">{ref.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Text input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              selectedRefs.length > 0
                ? "Ask about the selected references..."
                : "Ask about grading..."
            }
            aria-label="Chat message input"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim()}
            className="size-8 shrink-0 bg-primary hover:bg-primary/90"
            aria-label="Send message"
          >
            <Send className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
