"use client"

import { useRef, useState } from "react"
import { FileText, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { StudentSubmissionSummary } from "@/lib/student-queries"

interface PdfUploadFormProps {
  courseId: number
  assignmentId: number
  onSuccess: (submission: StudentSubmissionSummary) => void
}

export function PdfUploadForm({ courseId, assignmentId, onSuccess }: PdfUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError(null)

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (file.type !== "application/pdf") {
      setSelectedFile(null)
      setError("Only PDF files are accepted. Please select a .pdf file.")
      return
    }

    setSelectedFile(file)
  }

  function handleClear() {
    setSelectedFile(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/submit`,
        { method: "POST", body: formData },
      )

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Upload failed. Please try again.")
        return
      }

      toast.success("Submission uploaded successfully.")
      handleClear()
      onSuccess({
        id: data.submissionId,
        attemptNumber: data.attemptNumber,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        fileUrl: data.fileUrl,
      })
    } catch {
      setError("A network error occurred. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone / file selector */}
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-10 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
          <UploadCloud className="h-6 w-6 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Click to select a PDF
          </p>
          <p className="text-xs text-gray-400 mt-0.5">PDF only · Max 25 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Selected file display */}
      {selectedFile && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-white px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <FileText className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-800">{selectedFile.name}</p>
            <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!selectedFile || loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {loading ? "Uploading…" : "Submit Assignment"}
      </Button>
    </form>
  )
}
