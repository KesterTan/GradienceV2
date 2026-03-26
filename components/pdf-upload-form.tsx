"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function PdfUploadForm({
  courseId,
  assignmentId,
}: {
  courseId: number
  assignmentId: number
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted")
      e.target.value = ""
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) {
      toast.error("Please select a PDF file to upload")
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
        toast.error(data.error ?? "Upload failed. Please try again.")
        return
      }

      toast.success("Submission uploaded successfully")
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ""
      router.refresh()
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
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
