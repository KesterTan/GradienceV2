"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  courseId: number
  assignmentId: number
  submissionId: number
  isReleased: boolean
}

export function InstructorReleaseButton({ courseId, assignmentId, submissionId, isReleased }: Props) {
  const router = useRouter()
  const [releasing, setReleasing] = useState(false)
  const [released, setReleased] = useState(isReleased)
  const [error, setError] = useState<string | null>(null)

  if (released) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-emerald-700">
        <CheckCircle className="size-4" />
        <span>Grades released</span>
      </div>
    )
  }

  const handleRelease = async () => {
    setReleasing(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/courses/${courseId}/assessments/${assignmentId}/submissions/${submissionId}/release`,
        { method: "PATCH" },
      )

      const payload = await response.json().catch(() => ({ error: "Unable to release grades." }))

      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : "Unable to release grades.")
        return
      }

      setReleased(true)
      router.refresh()
    } catch {
      setError("Unable to release grades. Please try again.")
    } finally {
      setReleasing(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" disabled={releasing} onClick={handleRelease}>
        {releasing ? "Releasing..." : "Release grades"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
