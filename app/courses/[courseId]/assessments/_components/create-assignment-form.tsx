"use client"

import Link from "next/link"
import { useActionState, useMemo } from "react"
import { createAssignmentAction } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type AssignmentFormState = {
  errors?: {
    title?: string[]
    description?: string[]
    startDate?: string[]
    startTime?: string[]
    endDate?: string[]
    endTime?: string[]
    lateUntilDate?: string[]
    lateUntilTime?: string[]
    courseId?: string[]
    _form?: string[]
  }
  values?: {
    title: string
    description: string
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    lateUntilDate: string
    lateUntilTime: string
  }
}

const initialState: AssignmentFormState = {}

export function CreateAssignmentForm({ courseId }: { courseId: number }) {
  const [state, formAction, pending] = useActionState(createAssignmentAction, initialState)

  const dateError = useMemo(() => state.errors?.endDate?.[0], [state.errors?.endDate])

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-2">
        <Label htmlFor="title">Assignment title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. Midterm 1"
          defaultValue={state.values?.title ?? ""}
          aria-invalid={!!state.errors?.title}
        />
        {state.errors?.title?.[0] && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Optional instructions, topics covered, grading policy..."
          defaultValue={state.values?.description ?? ""}
          aria-invalid={!!state.errors?.description}
        />
        {state.errors?.description?.[0] && (
          <p className="text-sm text-destructive">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={state.values?.startDate ?? ""}
            aria-invalid={!!state.errors?.startDate}
          />
          {state.errors?.startDate?.[0] && (
            <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={state.values?.endDate ?? ""}
            aria-invalid={!!state.errors?.endDate}
          />
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lateUntilDate">Late-until date</Label>
          <Input
            id="lateUntilDate"
            name="lateUntilDate"
            type="date"
            defaultValue={state.values?.lateUntilDate ?? ""}
            aria-invalid={!!state.errors?.lateUntilDate}
          />
          {state.errors?.lateUntilDate?.[0] && (
            <p className="text-sm text-destructive">{state.errors.lateUntilDate[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lateUntilTime">Late-until time</Label>
          <Input
            id="lateUntilTime"
            name="lateUntilTime"
            type="time"
            defaultValue={state.values?.lateUntilTime ?? ""}
            aria-invalid={!!state.errors?.lateUntilTime}
          />
          {state.errors?.lateUntilTime?.[0] && (
            <p className="text-sm text-destructive">{state.errors.lateUntilTime[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={state.values?.startTime ?? ""}
            aria-invalid={!!state.errors?.startTime}
          />
          {state.errors?.startTime?.[0] && (
            <p className="text-sm text-destructive">{state.errors.startTime[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End time</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={state.values?.endTime ?? ""}
            aria-invalid={!!state.errors?.endTime}
          />
          {state.errors?.endTime?.[0] && (
            <p className="text-sm text-destructive">{state.errors.endTime[0]}</p>
          )}
        </div>
      </div>

      {state.errors?.courseId?.[0] && <p className="text-sm text-destructive">{state.errors.courseId[0]}</p>}
      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
          <Link href={`/courses/${courseId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Creating..." : "Create assignment"}
        </Button>
      </div>
    </form>
  )
}

