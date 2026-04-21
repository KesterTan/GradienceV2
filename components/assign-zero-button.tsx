"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

type Props = {
  courseId: number
  assignmentId: number
  studentMembershipId: number
}

export function AssignZeroButton({ courseId, assignmentId, studentMembershipId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAssignZero = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/assign-zero`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentMembershipId }),
        },
      )

      const payload = await response.json().catch(() => ({ error: "Unable to assign zero." }))

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to assign zero.")
        return
      }

      router.refresh()
    } catch {
      setError("Unable to assign zero. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={loading} onClick={handleAssignZero}>
        {loading ? "Assigning..." : "Assign zero & release"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
