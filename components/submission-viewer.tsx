"use client"

import { useGrading } from "@/lib/grading-context"
import { cn } from "@/lib/utils"
import { FileText } from "lucide-react"

interface SubmissionViewerProps {
  highlightedQuestionId?: string
  className?: string
}

export function SubmissionViewer({ highlightedQuestionId, className }: SubmissionViewerProps) {
  const { submissions, selectedStudentId } = useGrading()
  const student = submissions.find((s) => s.id === selectedStudentId)

  if (!student) return null

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center gap-2 border-b px-5 py-3 bg-white">
        <FileText className="size-4 text-primary/60" />
        <span className="text-sm font-semibold text-foreground">{student.fileName}</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {student.questions.length} questions
        </span>
      </div>
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="p-6 space-y-6 pb-12">
          {student.questions.map((q, i) => (
            <article
              key={q.id}
              id={`question-${q.id}`}
              className={cn(
                "rounded-lg border bg-white p-5 transition-all duration-300",
                highlightedQuestionId === q.id
                  ? "border-primary/40 shadow-sm ring-1 ring-primary/20"
                  : "border-border"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {q.title}
                </h3>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {q.content}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
