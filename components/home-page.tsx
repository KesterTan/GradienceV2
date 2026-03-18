"use client"

import { useGrading } from "@/lib/grading-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  GraduationCap,
  Users,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

function getStatusInfo(
  studentId: string,
  rubricGenerated: Record<string, boolean>,
  gradingComplete: Record<string, boolean>
) {
  if (gradingComplete[studentId]) {
    return { label: "Graded", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 }
  }
  if (rubricGenerated[studentId]) {
    return { label: "Rubric Ready", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Sparkles }
  }
  return { label: "Pending", color: "bg-zinc-100 text-zinc-600 border-zinc-200", icon: Clock }
}

export function HomePage() {
  const {
    submissions,
    rubricGenerated,
    gradingComplete,
    gradingResults,
    selectStudentAndNavigate,
  } = useGrading()

  const totalStudents = submissions.length
  const gradedCount = Object.values(gradingComplete).filter(Boolean).length
  const rubricCount = Object.values(rubricGenerated).filter(Boolean).length

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scroll-smooth">
      {/* Hero section */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center rounded-xl bg-primary/10 p-2.5">
              <GraduationCap className="size-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Gradient
            </h1>
          </div>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-muted-foreground">
            AI-powered grading platform. Select a student submission to review, generate rubrics, and grade with AI assistance.
          </p>

          {/* Summary stats */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <span className="text-xs font-medium">Total Submissions</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{totalStudents}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="size-4" />
                <span className="text-xs font-medium">Rubrics Generated</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{rubricCount}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="size-4" />
                <span className="text-xs font-medium">Graded</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{gradedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions list */}
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Student Submissions
        </h2>
        <div className="space-y-3">
          {submissions.map((student) => {
            const status = getStatusInfo(student.id, rubricGenerated, gradingComplete)
            const StatusIcon = status.icon
            const results = gradingResults[student.id] || []
            const totalEarned = results.reduce((s, r) => s + r.earnedPoints, 0)
            const totalMax = results.reduce((s, r) => s + r.totalPoints, 0)

            return (
              <div
                key={student.id}
                className="group flex items-center gap-4 rounded-lg border bg-white p-5 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                  <FileText className="size-5 text-primary/70" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {student.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] font-medium", status.color)}
                    >
                      <StatusIcon className="mr-1 size-3" />
                      {status.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{student.fileName}</span>
                    <span className="text-muted-foreground/40">|</span>
                    <span>{student.questions.length} questions</span>
                    {gradingComplete[student.id] && totalMax > 0 && (
                      <>
                        <span className="text-muted-foreground/40">|</span>
                        <span className={cn(
                          "font-semibold",
                          (totalEarned / totalMax) >= 0.9 ? "text-emerald-600" :
                          (totalEarned / totalMax) >= 0.7 ? "text-amber-600" : "text-red-600"
                        )}>
                          {totalEarned}/{totalMax} pts ({Math.round((totalEarned / totalMax) * 100)}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => selectStudentAndNavigate(student.id)}
                  variant={gradingComplete[student.id] ? "outline" : "default"}
                  size="sm"
                  className="gap-2 shrink-0"
                >
                  {gradingComplete[student.id] ? "Review" : "Start"}
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
