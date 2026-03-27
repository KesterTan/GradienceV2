"use client"

import Link from "next/link"
import { useActionState, useMemo, useState } from "react"
import { updateAssignmentAction } from "../../../actions"
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
    maxAttemptResubmission?: string[]
    courseId?: string[]
    assignmentId?: string[]
    _form?: string[]
  }
  values?: Record<string, string>
}

const initialState: AssignmentFormState = {}

export function EditAssignmentForm(props: {
  courseId: number
  assignmentId: number
  initialValues: {
    title: string
    description: string
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    lateUntilDate: string
    lateUntilTime: string
    allowResubmissions: boolean
    maxAttemptResubmission: number
  }
}) {
  const { courseId, assignmentId, initialValues } = props
  const [state, formAction, pending] = useActionState(updateAssignmentAction, initialState)
  const [allowResubmissions, setAllowResubmissions] = useState(
    state.values?.allowResubmissions === "on" ? true : initialValues.allowResubmissions
  )
  const [enableLateDeadline, setEnableLateDeadline] = useState(
    state.values?.enableLateDeadline === "on" ? true : Boolean(initialValues.lateUntilDate)
  )

  const dateError = useMemo(() => state.errors?.endDate?.[0], [state.errors?.endDate])
  const values = state.values ?? {}

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />

      <div className="space-y-2">
        <Label htmlFor="title">Assignment title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="e.g. Midterm 1"
          defaultValue={values.title ?? initialValues.title}
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
          defaultValue={values.description ?? initialValues.description}
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
            defaultValue={values.startDate ?? initialValues.startDate}
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
            defaultValue={values.endDate ?? initialValues.endDate}
            aria-invalid={!!state.errors?.endDate}
          />
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startTime">Start time</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={values.startTime ?? initialValues.startTime}
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
            defaultValue={values.endTime ?? initialValues.endTime}
            aria-invalid={!!state.errors?.endTime}
          />
          {state.errors?.endTime?.[0] && (
            <p className="text-sm text-destructive">{state.errors.endTime[0]}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            id="enableLateDeadline"
            name="enableLateDeadline"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={enableLateDeadline}
            onChange={(e) => setEnableLateDeadline(e.target.checked)}
          />
          <Label htmlFor="enableLateDeadline">Enable late deadline</Label>
        </div>

        {enableLateDeadline && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="lateUntilDate">Late deadline date</Label>
              <Input
                id="lateUntilDate"
                name="lateUntilDate"
                type="date"
                defaultValue={values.lateUntilDate ?? initialValues.lateUntilDate}
                aria-invalid={!!state.errors?.lateUntilDate}
              />
              {state.errors?.lateUntilDate?.[0] && (
                <p className="text-sm text-destructive">{state.errors.lateUntilDate[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lateUntilTime">Late deadline time</Label>
              <Input
                id="lateUntilTime"
                name="lateUntilTime"
                type="time"
                defaultValue={values.lateUntilTime ?? initialValues.lateUntilTime}
                aria-invalid={!!state.errors?.lateUntilTime}
              />
              {state.errors?.lateUntilTime?.[0] && (
                <p className="text-sm text-destructive">{state.errors.lateUntilTime[0]}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            id="allowResubmissions"
            name="allowResubmissions"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={allowResubmissions}
            onChange={(e) => setAllowResubmissions(e.target.checked)}
          />
          <Label htmlFor="allowResubmissions">Allow resubmissions</Label>
        </div>

        {allowResubmissions && (
          <div className="space-y-2">
            <Label htmlFor="maxAttemptResubmission">Maximum resubmissions</Label>
            <Input
              id="maxAttemptResubmission"
              name="maxAttemptResubmission"
              type="number"
              min={1}
              placeholder="e.g. 2"
              defaultValue={values.maxAttemptResubmission ?? String(initialValues.maxAttemptResubmission || 1)}
              aria-invalid={!!state.errors?.maxAttemptResubmission}
            />
            <p className="text-xs text-muted-foreground">
              Total number of submissions allowed (e.g. 3 = initial submission + 2 resubmissions).
            </p>
            {state.errors?.maxAttemptResubmission?.[0] && (
              <p className="text-sm text-destructive">{state.errors.maxAttemptResubmission[0]}</p>
            )}
          </div>
        )}
      </div>

      {state.errors?.assignmentId?.[0] && <p className="text-sm text-destructive">{state.errors.assignmentId[0]}</p>}
      {state.errors?.courseId?.[0] && <p className="text-sm text-destructive">{state.errors.courseId[0]}</p>}
      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
          <Link href={`/courses/${courseId}/assessments/${assignmentId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  )
}

