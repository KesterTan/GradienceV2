"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, ExternalLink, FileText, RotateCcw, UploadCloud } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MemberSubmissionHistoryItem } from "@/lib/course-management"

type AssessmentSubmissionPanelProps = {
  courseId: number
  assignmentId: number
  assignmentTitle: string
  dueAt: string
  lateUntil: string | null
  totalPoints: number
  allowResubmissions: boolean
  maxAttemptResubmission: number
  history: MemberSubmissionHistoryItem[]
  isInstructor?: boolean
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

function statusStyles(status: string, isInstructor = false) {
  const s = status.trim().toLowerCase()
  if (s === "submitted") return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (s === "late" && !isInstructor) return "border-amber-200 bg-amber-50 text-amber-700"
  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function AssessmentSubmissionPanel({
  courseId,
  assignmentId,
  assignmentTitle,
  dueAt,
  lateUntil,
  totalPoints,
  allowResubmissions,
  maxAttemptResubmission,
  history,
  isInstructor = false,
}: AssessmentSubmissionPanelProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [restoringSubmissionId, setRestoringSubmissionId] = useState<number | null>(null)

  const now = new Date()
  const dueDate = new Date(dueAt)
  const lateDate = lateUntil ? new Date(lateUntil) : null
  const isPastDue = now > dueDate
  const inLateWindow = isPastDue && lateDate !== null && now <= lateDate
  const submissionsClosed = !isInstructor && isPastDue && !inLateWindow

  const maxAllowed = allowResubmissions ? Math.max(1, maxAttemptResubmission) : 1
  const maxReached = history.length >= maxAllowed

  // Upload is blocked by deadline OR hitting the submission cap (instructors have no deadline)
  const uploadDisabled = submissionsClosed || maxReached

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      return
    }

    const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    if (!looksLikePdf) {
      setErrorMessage("Please select a PDF file.")
      setSelectedFile(null)
      event.currentTarget.value = ""
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("PDF must be 25 MB or smaller.")
      setSelectedFile(null)
      event.currentTarget.value = ""
      return
    }

    setErrorMessage(null)
    setInfoMessage(null)
    setSelectedFile(file)
  }

  const submitNewVersion = async () => {
    if (!selectedFile || isSubmitting) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const formData = new FormData()
      formData.set("file", selectedFile)

      const response = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/submit`,
        {
          method: "POST",
          body: formData,
        },
      )

      const payload = await response.json().catch(() => ({ error: "Unable to submit assignment." }))

      if (!response.ok) {
        setErrorMessage(typeof payload.error === "string" ? payload.error : "Unable to submit assignment.")
        return
      }

      setInfoMessage("New submission uploaded.")
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      router.refresh()
    } catch {
      setErrorMessage("Unable to submit assignment. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const restoreSubmission = async (submissionId: number) => {
    if (restoringSubmissionId !== null) return

    setRestoringSubmissionId(submissionId)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const response = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId }),
        },
      )

      const payload = await response.json().catch(() => ({ error: "Unable to restore submission." }))

      if (!response.ok) {
        setErrorMessage(typeof payload.error === "string" ? payload.error : "Unable to restore submission.")
        return
      }

      setInfoMessage("A new version was created from the selected submission.")
      router.refresh()
    } catch {
      setErrorMessage("Unable to restore submission. Please try again.")
    } finally {
      setRestoringSubmissionId(null)
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="bg-slate-50/70">
        <CardContent className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <FileText className="size-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{assignmentTitle}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Due {format(dueDate, "MMM d, yyyy 'at' h:mm a")}
                </p>
                {!isInstructor && lateDate && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-amber-600">
                    <Calendar className="size-3.5" />
                    Late submissions accepted until {format(lateDate, "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{totalPoints} points</p>
          </div>
        </CardContent>
      </Card>

      <Card className={uploadDisabled ? "opacity-60" : undefined}>
        <CardHeader>
          <CardTitle>Submit a new version</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5 pb-5 sm:px-6">
          {submissionsClosed && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              The deadline for this assignment has passed. Submissions are closed.
            </div>
          )}

          {!isInstructor && inLateWindow && !maxReached && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              You are past the deadline — this submission will be marked as late.
            </div>
          )}

          {!submissionsClosed && maxReached && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              You have used all {maxAllowed} submission attempt{maxAllowed !== 1 ? "s" : ""} for this assignment. You can still restore a previous version below.
            </div>
          )}

          {!isInstructor && !uploadDisabled && !inLateWindow && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Submit before {format(dueDate, "MMM d, yyyy 'at' h:mm a")}.
            </div>
          )}

          <label
            htmlFor="submission-pdf"
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center ${uploadDisabled ? "cursor-not-allowed border-muted/40 bg-muted/20" : "cursor-pointer border-primary/30 bg-primary/5 transition-colors hover:border-primary/50 hover:bg-primary/10"}`}
          >
            <div className={`rounded-xl p-3 ${uploadDisabled ? "bg-muted/30 text-muted-foreground" : "bg-primary/15 text-primary"}`}>
              <UploadCloud className="size-6" />
            </div>
            <p className="mt-3 text-base font-medium text-foreground">
              {selectedFile ? selectedFile.name : "Click to select a PDF"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">PDF only · Max 25 MB</p>
            <input
              ref={fileInputRef}
              id="submission-pdf"
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={uploadDisabled}
              onChange={handleFileChange}
            />
          </label>

          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          {infoMessage && <p className="text-sm text-emerald-700">{infoMessage}</p>}

          <Button
            type="button"
            className="w-full"
            disabled={!selectedFile || isSubmitting || uploadDisabled}
            onClick={submitNewVersion}
          >
            {isSubmitting ? "Submitting..." : "Submit Assignment"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submission history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5 sm:px-6">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-lg border bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">Version {item.attemptNumber}</p>
                      {item.isCurrent && <Badge className="bg-primary text-primary-foreground">Current</Badge>}
                      <Badge variant="outline" className={statusStyles(item.status, isInstructor)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.fileUrl && (
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/api/courses/${courseId}/assessments/${assignmentId}/submissions/${item.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View PDF
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </Button>
                  )}

                  {!isInstructor && (
                    <Button asChild size="sm" variant="ghost">
                      <Link
                        href={`/courses/${courseId}/assessments/${assignmentId}/submissions/${item.id}/grade`}
                      >
                        View Grade
                      </Link>
                    </Button>
                  )}

                  {!item.isCurrent && item.fileUrl && !submissionsClosed && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={restoringSubmissionId === item.id}
                      onClick={() => restoreSubmission(item.id)}
                    >
                      <RotateCcw className="size-3.5" />
                      {restoringSubmissionId === item.id ? "Restoring..." : "Restore"}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}