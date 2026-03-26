"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  courseId: number
  assignmentId: number
  submissionId: number
}

export function InstructorRestoreButton({ courseId, assignmentId, submissionId }: Props) {
  const router = useRouter()
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRestore = async () => {
    setRestoring(true)
    setError(null)

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
        setError(typeof payload.error === "string" ? payload.error : "Unable to restore submission.")
        return
      }

      router.refresh()
    } catch {
      setError("Unable to restore submission. Please try again.")
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={restoring} onClick={handleRestore}>
        <RotateCcw className="size-3.5" />
        {restoring ? "Restoring..." : "Restore"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
