"use client"

import { useActionState } from "react"
import { deleteCourseAction, type CourseDeleteState } from "@/app/courses/[courseId]/manage/actions"
import { Button } from "@/components/ui/button"

type DeleteCourseButtonProps = {
  courseId: number
  courseTitle: string
}

const initialState: CourseDeleteState = {}

export function DeleteCourseButton({ courseId, courseTitle }: DeleteCourseButtonProps) {
  const [state, formAction, pending] = useActionState(deleteCourseAction, initialState)

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="courseId" value={courseId} />
      {state.errors?._form?.[0] && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}
      <Button
        type="submit"
        variant="destructive"
        disabled={pending}
        onClick={(event) => {
          const ok = window.confirm(
            `Delete ${courseTitle}? This removes enrollments, assignments, and submissions.`,
          )
          if (!ok) {
            event.preventDefault()
          }
        }}
      >
        {pending ? "Deleting..." : "Delete course"}
      </Button>
    </form>
  )
}
