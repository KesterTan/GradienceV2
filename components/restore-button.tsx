"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export function RestoreButton({
  courseId,
  assignmentId,
  submissionId,
}: {
  courseId: number
  assignmentId: number
  submissionId: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleRestore() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/restore`,
        { method: "POST" },
      )
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Restore failed", description: data.error ?? "Please try again.", variant: "destructive" })
        return
      }
      toast({ title: "Version restored", description: "This version is now your active submission." })
      router.refresh()
    } catch {
      toast({ title: "Restore failed", description: "Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleRestore} disabled={loading} variant="outline" size="sm">
      {loading ? "Restoring…" : "Restore as active"}
    </Button>
  )
}
