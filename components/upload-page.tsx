"use client"

import { useGrading } from "@/lib/grading-context"
import { SubmissionViewer } from "./submission-viewer"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function UploadPage() {
  const { setPage, selectedStudentId, submissions } = useGrading()
  const student = submissions.find((s) => s.id === selectedStudentId)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {student?.name} &mdash; Submission
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Review the submission before generating rubrics
          </p>
        </div>
        <Button onClick={() => setPage("rubric")} className="gap-2">
          Continue to Rubric
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden bg-muted/40">
        <SubmissionViewer />
      </div>
    </div>
  )
}
