"use client"

import Link from "next/link"
import { useState } from "react"
import { format } from "date-fns"
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { StudentSubmissionRow } from "@/lib/course-management"

type SubmissionVersion = {
  id: number
  attemptNumber: number
  status: string
  submittedAt: string
  fileUrl: string | null
}

type Props = {
  courseId: number
  assignmentId: number
  students: StudentSubmissionRow[]
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    submitted: {
      label: "Submitted",
      className: "bg-green-50 text-green-700 border border-green-200",
    },
    resubmitted: {
      label: "Resubmitted",
      className: "bg-blue-50 text-blue-700 border border-blue-200",
    },
    late: {
      label: "Late",
      className: "bg-amber-50 text-amber-700 border border-amber-200",
    },
    graded: {
      label: "Graded",
      className: "bg-purple-50 text-purple-700 border border-purple-200",
    },
  }
  const config = map[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function StudentRow({
  student,
  courseId,
  assignmentId,
  history,
  onExpand,
  onRestore,
}: {
  student: StudentSubmissionRow
  courseId: number
  assignmentId: number
  history: { versions: SubmissionVersion[] | null; loading: boolean; error: string | null }
  onExpand: (studentMembershipId: number) => void
  onRestore: (studentMembershipId: number, submission: SubmissionVersion) => void
}) {
  const [expanded, setExpanded] = useState(false)

  function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next && history.versions === null) {
      onExpand(student.studentMembershipId)
    }
  }

  const latest = student.latestSubmission

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{student.studentName}</CardTitle>
            <CardDescription>{student.studentEmail}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={latest.status} />
            <span className="text-xs text-muted-foreground">
              v{latest.attemptNumber} of {student.totalAttempts}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Latest submission row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Submitted{" "}
            <span className="font-medium text-foreground">
              {format(new Date(latest.submittedAt), "MMM d, yyyy h:mm a")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {latest.fileUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={latest.fileUrl} target="_blank" rel="noopener noreferrer">
                  View PDF
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <Link
                href={`/courses/${courseId}/assessments/${assignmentId}/submissions/${latest.id}`}
              >
                Open submission
              </Link>
            </Button>
          </div>
        </div>

        {/* History toggle */}
        {student.totalAttempts > 1 && (
          <div>
            <button
              onClick={handleExpand}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {expanded ? "Hide" : "Show"} version history ({student.totalAttempts} versions)
            </button>

            {expanded && (
              <div className="mt-2 space-y-1.5 rounded-md border bg-muted/40 p-3">
                {history.loading && (
                  <p className="text-xs text-muted-foreground">Loading history…</p>
                )}
                {history.error && (
                  <p className="text-xs text-destructive">{history.error}</p>
                )}
                {history.versions &&
                  [...history.versions].reverse().map((ver) => {
                    const isCurrent = ver.id === latest.id
                    return (
                      <div
                        key={ver.id}
                        className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm ${
                          isCurrent ? "border-l-2 border-indigo-500 bg-white pl-3" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">v{ver.attemptNumber}</span>
                          <StatusBadge status={ver.status} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ver.submittedAt), "MMM d, h:mm a")}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-indigo-600">Current</span>
                          )}
                        </div>
                        {!isCurrent && (
                          <button
                            onClick={() => onRestore(student.studentMembershipId, ver)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type HistoryEntry = { versions: SubmissionVersion[] | null; loading: boolean; error: string | null }

export function AssessmentClient({ courseId, assignmentId, students }: Props) {
  const [restoreTarget, setRestoreTarget] = useState<{
    studentMembershipId: number
    submission: SubmissionVersion
  } | null>(null)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  // Map from studentMembershipId → updated latest submission after restore
  const [overrides, setOverrides] = useState<Record<number, SubmissionVersion>>({})
  // Map from studentMembershipId → fetched history
  const [historyMap, setHistoryMap] = useState<Record<number, HistoryEntry>>({})

  async function handleExpand(studentMembershipId: number) {
    setHistoryMap((prev) => ({
      ...prev,
      [studentMembershipId]: { versions: null, loading: true, error: null },
    }))
    try {
      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/student/${studentMembershipId}/history`,
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to load history")
      }
      const data = await res.json()
      setHistoryMap((prev) => ({
        ...prev,
        [studentMembershipId]: { versions: data.history as SubmissionVersion[], loading: false, error: null },
      }))
    } catch (err) {
      setHistoryMap((prev) => ({
        ...prev,
        [studentMembershipId]: { versions: null, loading: false, error: err instanceof Error ? err.message : "Unknown error" },
      }))
    }
  }

  function handleRestoreRequest(studentMembershipId: number, submission: SubmissionVersion) {
    setRestoreTarget({ studentMembershipId, submission })
    setRestoreError(null)
  }

  async function confirmRestore() {
    if (!restoreTarget) return
    setRestoreLoading(true)
    setRestoreError(null)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/instructor-restore`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentMembershipId: restoreTarget.studentMembershipId,
            submissionId: restoreTarget.submission.id,
          }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Restore failed")
      }
      const data = await res.json()
      const newVersion: SubmissionVersion = {
        id: data.submissionId,
        attemptNumber: data.attemptNumber,
        status: "resubmitted",
        submittedAt: new Date().toISOString(),
        fileUrl: data.fileUrl,
      }
      const mid = restoreTarget.studentMembershipId
      setOverrides((prev) => ({ ...prev, [mid]: newVersion }))
      // Append to history if it was already loaded
      setHistoryMap((prev) => {
        const existing = prev[mid]
        if (!existing?.versions) return prev
        return {
          ...prev,
          [mid]: { ...existing, versions: [...existing.versions, newVersion] },
        }
      })
      setRestoreTarget(null)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setRestoreLoading(false)
    }
  }

  // Merge overrides into student rows so the latest card reflects restored version
  const mergedStudents = students.map((s) => {
    const override = overrides[s.studentMembershipId]
    if (!override) return s
    return {
      ...s,
      latestSubmission: override,
      totalAttempts: override.attemptNumber,
    }
  })

  if (mergedStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No submissions yet</CardTitle>
          <CardDescription>Student submissions for this assessment will appear here.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const emptyHistory: HistoryEntry = { versions: null, loading: false, error: null }

  return (
    <>
      <div className="grid gap-4">
        {mergedStudents.map((student) => (
          <StudentRow
            key={student.studentMembershipId}
            student={student}
            courseId={courseId}
            assignmentId={assignmentId}
            history={historyMap[student.studentMembershipId] ?? emptyHistory}
            onExpand={handleExpand}
            onRestore={handleRestoreRequest}
          />
        ))}
      </div>

      <Dialog
        open={restoreTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore version</DialogTitle>
            <DialogDescription>
              This will create a new submission copying{" "}
              <strong>version {restoreTarget?.submission.attemptNumber}</strong> as the latest for
              this student. The original submissions are preserved.
            </DialogDescription>
          </DialogHeader>
          {restoreError && <p className="text-sm text-destructive">{restoreError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={restoreLoading}
            >
              Cancel
            </Button>
            <Button onClick={confirmRestore} disabled={restoreLoading}>
              {restoreLoading ? "Restoring…" : "Yes, restore"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
