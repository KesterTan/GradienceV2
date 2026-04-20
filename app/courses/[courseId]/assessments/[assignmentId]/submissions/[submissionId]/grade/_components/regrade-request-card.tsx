"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { RegradeRequest } from "@/lib/course-management"

type Props = {
  courseId: number
  assignmentId: number
  submissionId: number
  existingRequest: RegradeRequest | null
}

export function RegradeRequestCard({ courseId, assignmentId, submissionId, existingRequest }: Props) {
  const [reason, setReason] = useState("")
  const [pending, setPending] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingRequest?.status === "resolved") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regrade request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-emerald-700">Regrade resolved.</p>
        </CardContent>
      </Card>
    )
  }

  if (existingRequest?.status === "pending" || submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regrade request</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Regrade requested — pending review.</p>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit() {
    if (!reason.trim()) return
    setPending(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/submissions/${submissionId}/regrade`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? "Failed to submit request.")
      } else {
        setSubmitted(true)
      }
    } catch {
      setError("Failed to submit request. Please try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request regrade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Explain why you believe this submission was graded incorrectly.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe your reason for requesting a regrade..."
          rows={4}
          disabled={pending}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSubmit} disabled={pending || !reason.trim()} className="w-full">
          {pending ? "Submitting..." : "Request regrade"}
        </Button>
      </CardContent>
    </Card>
  )
}
