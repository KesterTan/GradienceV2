"use client"

import { useActionState, useMemo } from "react"
import Link from "next/link"
import { updateCourseAction, type CourseManageFormState } from "@/app/courses/[courseId]/manage/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type EditCourseFormProps = {
  courseId: number
  title: string
  startDate: string
  endDate: string
}

const initialState: CourseManageFormState = {}

export function EditCourseForm({ courseId, title, startDate, endDate }: EditCourseFormProps) {
  const [state, formAction, pending] = useActionState(updateCourseAction, initialState)
  const dateError = useMemo(() => state.errors?.endDate?.[0], [state.errors?.endDate])

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <input type="hidden" name="courseId" value={courseId} />

      <div className="space-y-2">
        <Label htmlFor="title">Course title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={title}
          placeholder="e.g. Intro to Databases"
          aria-invalid={!!state.errors?.title}
        />
        {state.errors?.title?.[0] && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={startDate}
            aria-invalid={!!state.errors?.startDate}
          />
          {state.errors?.startDate?.[0] && <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={endDate}
            aria-invalid={!!state.errors?.endDate}
          />
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>
      </div>

      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}

      <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center">
        <Button asChild type="button" variant="outline" className="w-full sm:w-auto">
          <Link href={`/courses/${courseId}`}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
