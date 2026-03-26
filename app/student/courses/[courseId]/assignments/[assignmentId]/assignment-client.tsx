"use client"

import { useState } from "react"
import { Calendar, CheckCircle, FileText, Lock } from "lucide-react"
import { format } from "date-fns"
import { PdfUploadForm } from "@/components/pdf-upload-form"
import { StudentAssignmentDetail, StudentSubmissionSummary } from "@/lib/student-queries"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AssignmentClientProps {
  assignment: StudentAssignmentDetail
  initialSubmissions: StudentSubmissionSummary[]
}

const STATUS_STYLES: Record<string, string> = {
  submitted: "bg-green-50 text-green-700 border-green-200",
  late: "bg-amber-50 text-amber-700 border-amber-200",
  resubmitted: "bg-blue-50 text-blue-700 border-blue-200",
  graded: "bg-indigo-50 text-indigo-700 border-indigo-200",
}

export function AssignmentClient({ assignment, initialSubmissions }: AssignmentClientProps) {
  const [submissions, setSubmissions] = useState<StudentSubmissionSummary[]>(initialSubmissions)
  const [showSuccess, setShowSuccess] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<StudentSubmissionSummary | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  function handleUploadSuccess(newSubmission: StudentSubmissionSummary) {
    setSubmissions((prev) => [...prev, newSubmission])
    setShowSuccess(true)
  }

  async function handleRestore() {
    if (!restoreTarget) return
    setRestoreLoading(true)
    setRestoreError(null)

    try {
      const res = await fetch(
        `/api/courses/${assignment.courseId}/assignments/${assignment.id}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId: restoreTarget.id }),
        },
      )

      const data = await res.json()

      if (!res.ok) {
        setRestoreError(data.error ?? "Restore failed. Please try again.")
        return
      }

      setSubmissions((prev) => [
        ...prev,
        {
          id: data.submissionId,
          attemptNumber: data.attemptNumber,
          status: "resubmitted",
          submittedAt: new Date().toISOString(),
          fileUrl: data.fileUrl,
        },
      ])
      setRestoreTarget(null)
      setShowSuccess(true)
    } catch {
      setRestoreError("A network error occurred. Please try again.")
    } finally {
      setRestoreLoading(false)
    }
  }

  const dueDate = new Date(assignment.dueAt)
  const lateUntilDate = assignment.lateUntil ? new Date(assignment.lateUntil) : null
  const now = new Date()
  const isOverdue = now > dueDate
  const isDeadlinePassed = now > dueDate && (lateUntilDate === null || now > lateUntilDate)

  return (
    <div className="space-y-6">
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent showCloseButton={false} className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-lg">Submission received!</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Your submission for <span className="font-semibold text-gray-800">{assignment.title}</span> has been successfully uploaded.
          </p>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowSuccess(false)}
              className=" w-full sm:w-auto"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Restore confirmation dialog */}
      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreTarget(null)
            setRestoreError(null)
          }
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Version {restoreTarget?.attemptNumber}?</DialogTitle>
            <DialogDescription>
              This will create a new submission (Version {submissions.length + 1}) using the same
              file as Version {restoreTarget?.attemptNumber}. Your current submission will remain
              in the history.
            </DialogDescription>
          </DialogHeader>
          {restoreError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {restoreError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRestoreTarget(null)
                setRestoreError(null)
              }}
              disabled={restoreLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={restoreLoading}
              className=""
            >
              {restoreLoading ? "Restoring…" : "Yes, restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment details card */}
      <Card className="border-border/90">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{assignment.title}</CardTitle>
            {assignment.description && (
              <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due {format(dueDate, "MMM d, yyyy 'at' h:mm a")}
                {isOverdue && (
                  <Badge variant="outline" className="ml-1 text-amber-700 border-amber-200 bg-amber-50">
                    Past due
                  </Badge>
                )}
              </span>
              <span>{assignment.totalPoints} points</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload form / deadline closed */}
      {isDeadlinePassed ? (
        <Card className="border-border/90">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Submissions closed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The deadline for this assignment has passed. No further submissions are accepted.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Closed {format(lateUntilDate ?? dueDate, "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {submissions.length === 0 ? "Submit your work" : "Submit a new version"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {lateUntilDate && isOverdue && (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
                The deadline has passed but late submissions are accepted until{" "}
                <span className="font-medium">{format(lateUntilDate, "MMM d, yyyy 'at' h:mm a")}</span>.
              </p>
            )}
            <PdfUploadForm
              courseId={assignment.courseId}
              assignmentId={assignment.id}
              onSuccess={handleUploadSuccess}
            />
          </CardContent>
        </Card>
      )}

      {/* Submission history */}
      {submissions.length > 0 && (
        <Card className="border-border/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Submission history</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[...submissions].reverse().map((submission, index) => {
              const isCurrent = index === 0
              return (
                <div
                  key={submission.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                    isCurrent
                      ? "border-primary/20 bg-card border-l-4 border-l-primary"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isCurrent ? "bg-primary/10" : "bg-muted"}`}>
                      <FileText className={`h-4 w-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          Version {submission.attemptNumber}
                        </p>
                        {isCurrent && (
                          <Badge className="rounded-full px-2 py-0.5 text-xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`hidden sm:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[submission.status] ?? "bg-muted text-muted-foreground border-border"}`}
                    >
                      {submission.status}
                    </span>
                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary hover:text-primary/80 whitespace-nowrap"
                      >
                        View PDF ↗
                      </a>
                    )}
                    {!isCurrent && !isDeadlinePassed && (
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(submission)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
