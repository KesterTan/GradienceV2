"use client"

import Link from "next/link"
import { useState } from "react"
import { format } from "date-fns"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InstructorRestoreButton } from "@/components/instructor-restore-button"
import type { SubmissionSummary } from "@/lib/course-management"

type Props = {
  courseId: number
  assignmentId: number
  versions: SubmissionSummary[]
  hasPendingRegrade?: boolean
}

export function StudentSubmissionsCard({ courseId, assignmentId, versions, hasPendingRegrade }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false)

  const current = versions[0]
  const history = versions.slice(1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle>{current.studentName}</CardTitle>
          {hasPendingRegrade && (
            <Badge variant="outline" className="border-amber-400 text-amber-700">
              Regrade requested
            </Badge>
          )}
        </div>
        <CardDescription>{current.studentEmail}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 px-5 pb-5 sm:px-6">
        {/* Active submission */}
        <div className={`flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${current.status === "late" ? "border-amber-200 bg-amber-50" : "bg-slate-50"}`}>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Version {current.attemptNumber}</p>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">Current</span>
              <span className={`text-xs font-medium capitalize ${current.status === "late" ? "text-amber-700" : "text-muted-foreground"}`}>{current.status}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(current.submittedAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {current.fileUrl && (
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/api/courses/${courseId}/assessments/${assignmentId}/submissions/${current.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View PDF
                </Link>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href={`/courses/${courseId}/assessments/${assignmentId}/submissions/${current.id}`}>
                Open submission
              </Link>
            </Button>
            {hasPendingRegrade && (
              <Button asChild size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50">
                <Link href={`/courses/${courseId}/assessments/${assignmentId}/submissions/${current.id}/regrade`}>
                  Review regrade
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* History toggle */}
        {history.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setHistoryOpen((o) => !o)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {historyOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {historyOpen ? "Hide submission history" : `View submission history (${history.length} older version${history.length > 1 ? "s" : ""})`}
            </button>

            {historyOpen && (
              <div className="space-y-2 pt-1">
                {history.map((v) => (
                  <div
                    key={v.id}
                    className={`flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${v.status === "late" ? "border-amber-200 bg-amber-50" : "bg-slate-50"}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Version {v.attemptNumber}</p>
                        <span className={`text-xs font-medium capitalize ${v.status === "late" ? "text-amber-700" : "text-muted-foreground"}`}>{v.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(v.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {v.fileUrl && (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/api/courses/${courseId}/assessments/${assignmentId}/submissions/${v.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View PDF
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/courses/${courseId}/assessments/${assignmentId}/submissions/${v.id}`}>
                          Open submission
                        </Link>
                      </Button>
                      <InstructorRestoreButton
                        courseId={courseId}
                        assignmentId={assignmentId}
                        submissionId={v.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
