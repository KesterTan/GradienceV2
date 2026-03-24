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
              className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {restoreLoading ? "Restoring…" : "Yes, restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment details card */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <FileText className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{assignment.title}</h2>
            {assignment.description && (
              <p className="mt-1 text-sm text-gray-500">{assignment.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due {format(dueDate, "MMM d, yyyy 'at' h:mm a")}
                {isOverdue && (
                  <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Past due
                  </span>
                )}
              </span>
              <span>{assignment.totalPoints} points</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload form / deadline closed */}
      {isDeadlinePassed ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Submissions closed</p>
              <p className="mt-1 text-sm text-gray-500">
                The deadline for this assignment has passed. No further submissions are accepted.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Closed {format(lateUntilDate ?? dueDate, "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            {submissions.length === 0 ? "Submit your work" : "Submit a new version"}
          </h3>
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
        </div>
      )}

      {/* Submission history */}
      {submissions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Submission history</h3>
          <div className="space-y-3">
            {[...submissions].reverse().map((submission, index) => {
              const isCurrent = index === 0
              return (
                <div
                  key={submission.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
                    isCurrent
                      ? "border-indigo-200 bg-white border-l-4 border-l-indigo-500"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isCurrent ? "bg-indigo-100" : "bg-gray-200"}`}>
                      <FileText className={`h-4 w-4 ${isCurrent ? "text-indigo-500" : "text-gray-400"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-800">
                          Version {submission.attemptNumber}
                        </p>
                        {isCurrent && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`hidden sm:inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[submission.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                    >
                      {submission.status}
                    </span>
                    {submission.fileUrl && (
                      <a
                        href={submission.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                      >
                        View PDF ↗
                      </a>
                    )}
                    {!isCurrent && !isDeadlinePassed && (
                      <button
                        type="button"
                        onClick={() => setRestoreTarget(submission)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 whitespace-nowrap"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
