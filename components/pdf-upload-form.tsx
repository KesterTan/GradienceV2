"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function PdfUploadForm({
  courseId,
  assignmentId,
  dueAt,
}: {
  courseId: number
  assignmentId: number
  dueAt: string
}) {
  const isPastDeadline = new Date() > new Date(dueAt)
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file && file.type !== "application/pdf") {
      toast({ title: "Invalid file type", description: "Only PDF files are accepted.", variant: "destructive" })
      e.target.value = ""
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a PDF file to upload.", variant: "destructive" })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/submit`,
        { method: "POST", body: formData },
      )
      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Upload failed", description: data.error ?? "Please try again.", variant: "destructive" })
        return
      }

      toast({ title: "Submission uploaded", description: "Your work has been submitted successfully." })
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch {
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  if (isPastDeadline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submissions closed</CardTitle>
          <CardDescription>The deadline for this assignment has passed. No new submissions are accepted.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit your work</CardTitle>
        <CardDescription>Upload a PDF file for this assignment.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 size-4" />
              Choose PDF
            </Button>
            {selectedFile && (
              <span className="truncate text-sm text-muted-foreground">{selectedFile.name}</span>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? "Uploading…" : "Submit"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
