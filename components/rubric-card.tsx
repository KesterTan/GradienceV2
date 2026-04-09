"use client"

import { useState } from "react"
import { type QuestionRubric, type RubricCriterion } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface RubricCardProps {
  question: { id: string; title: string; content: string }
  rubric: QuestionRubric | null
  isGenerated: boolean
  isLoading: boolean
  onGenerate: () => void
  onUpdateRubric: (rubric: QuestionRubric) => void
  index: number
}

export function RubricCard({
  question,
  rubric,
  isGenerated,
  isLoading,
  onGenerate,
  onUpdateRubric,
  index,
}: RubricCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editCriteria, setEditCriteria] = useState<RubricCriterion[]>([])

  const startEditing = () => {
    if (rubric) {
      setEditCriteria(rubric.criteria.map((c) => ({ ...c })))
    } else {
      setEditCriteria([
        { id: `custom-${Date.now()}`, title: "", maxPoints: 5, description: "" },
      ])
    }
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditCriteria([])
  }

  const saveEditing = () => {
    const validCriteria = editCriteria.filter((c) => c.title.trim() !== "")
    if (validCriteria.length === 0) return

    const totalPoints = validCriteria.reduce((sum, c) => sum + c.maxPoints, 0)
    const updatedRubric: QuestionRubric = {
      id: rubric?.id || `custom-r-${question.id}`,
      questionTitle: question.title,
      totalPoints,
      criteria: validCriteria,
    }
    onUpdateRubric(updatedRubric)
    setIsEditing(false)
    setEditCriteria([])
  }

  const addCriterion = () => {
    setEditCriteria((prev) => [
      ...prev,
      { id: `custom-${Date.now()}-${prev.length}`, title: "", maxPoints: 5, description: "" },
    ])
  }

  const removeCriterion = (idx: number) => {
    setEditCriteria((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateCriterion = (idx: number, field: keyof RubricCriterion, value: string | number) => {
    setEditCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-lg border bg-white transition-all duration-200",
          isOpen ? "shadow-sm" : "",
          isLoading ? "border-primary/30" : "border-border"
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-foreground">
                {question.title}
              </h4>
              <div className="mt-0.5 flex items-center gap-2">
                {isGenerated && rubric && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      {rubric.totalPoints} pts
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {rubric.criteria.length} criteria
                    </span>
                  </>
                )}
                {isLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <Loader2 className="size-3 animate-spin" />
                    Generating...
                  </span>
                )}
                {!isGenerated && !isLoading && (
                  <span className="text-xs text-muted-foreground">No rubric yet</span>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="border-t">
            {/* Loading state */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="relative">
                  <div className="size-10 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 size-10 animate-spin rounded-full border-2 border-transparent border-t-primary" />
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  Analyzing question...
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Building rubric criteria with AI
                </p>
              </div>
            )}

            {/* Not generated - show generate / write options */}
            {!isLoading && !isGenerated && !isEditing && (
              <div className="p-4">
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {question.content.slice(0, 180)}...
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerate()
                    }}
                    size="sm"
                    className="gap-1.5"
                    data-testid="generate-rubric-button"
                  >
                    <Sparkles className="size-3.5" />
                    Generate
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing()
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    data-testid="write-rubric-button"
                  >
                    <Pencil className="size-3.5" />
                    Write Rubric
                  </Button>
                </div>
              </div>
            )}

            {/* Generated rubric display */}
            {!isLoading && isGenerated && rubric && !isEditing && (
              <div>
                <div className="divide-y">
                  {rubric.criteria.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start justify-between gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {c.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {c.description}
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {c.maxPoints} pts
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t px-4 py-2.5">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      onGenerate()
                    }}
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    data-testid="regenerate-rubric-button"
                  >
                    <Sparkles className="size-3" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing()
                    }}
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    data-testid="edit-rubric-button"
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                </div>
              </div>
            )}

            {/* Editing mode */}
            {isEditing && (
              <div className="p-4 space-y-3">
                {editCriteria.map((criterion, idx) => (
                  <div
                    key={criterion.id}
                    className="rounded-md border border-dashed bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="size-3.5 shrink-0 text-muted-foreground/50" />
                      <input
                        type="text"
                        value={criterion.title}
                        onChange={(e) =>
                          updateCriterion(idx, "title", e.target.value)
                        }
                        placeholder="Criterion title (e.g., Conceptual Understanding)"
                        data-testid={`criterion-title-${idx}`}
                        className="flex-1 rounded-md border bg-white px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground"
                      />
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={criterion.maxPoints}
                        onChange={(e) =>
                          updateCriterion(
                            idx,
                            "maxPoints",
                            Math.max(1, parseInt(e.target.value) || 1)
                          )
                        }
                        data-testid={`criterion-points-${idx}`}
                        className="w-16 rounded-md border bg-white px-2 py-1.5 text-center text-sm font-medium text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                      />
                      <span className="text-xs text-muted-foreground">pts</span>
                      {editCriteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCriterion(idx)}
                          className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={`Remove criterion ${idx + 1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={criterion.description}
                      onChange={(e) =>
                        updateCriterion(idx, "description", e.target.value)
                      }
                      placeholder="Describe what this criterion evaluates..."
                      data-testid={`criterion-description-${idx}`}
                      className="min-h-12 resize-none text-sm"
                      rows={2}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCriterion}
                  data-testid="add-criterion-button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="size-3.5" />
                  Add Criterion
                </button>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    onClick={cancelEditing}
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    data-testid="cancel-rubric-button"
                  >
                    <X className="size-3.5" />
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEditing}
                    size="sm"
                    className="gap-1.5"
                    disabled={editCriteria.every((c) => c.title.trim() === "")}
                    data-testid="save-rubric-button"
                  >
                    <Check className="size-3.5" />
                    Save Rubric
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
