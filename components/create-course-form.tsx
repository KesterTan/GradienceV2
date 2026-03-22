"use client"

import Link from "next/link"
import { useActionState, useMemo } from "react"
import { createCourseAction, type CourseFormState } from "@/app/courses/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: CourseFormState = {}

export function CreateCourseForm() {
  const [state, formAction, pending] = useActionState(createCourseAction, initialState)

  const dateError = useMemo(() => state.errors?.endDate?.[0], [state.errors?.endDate])

  return (
    <form action={formAction} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="title">Course title</Label>
        <Input id="title" name="title" required placeholder="e.g. Intro to Databases" aria-invalid={!!state.errors?.title} />
        {state.errors?.title?.[0] && <p className="text-sm text-destructive">{state.errors.title[0]}</p>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" aria-invalid={!!state.errors?.startDate} />
          {state.errors?.startDate?.[0] && <p className="text-sm text-destructive">{state.errors.startDate[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" aria-invalid={!!state.errors?.endDate} />
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
        </div>
      </div>

      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href="/courses">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create course"}
        </Button>
      </div>
    </form>
  )
}
