"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, courses } from "@/db/schema"
import { requireGraderUser } from "@/lib/current-user"

type AssignmentFormState = {
  errors?: {
    title?: string[]
    description?: string[]
    startDate?: string[]
    startTime?: string[]
    endDate?: string[]
    endTime?: string[]
    courseId?: string[]
    _form?: string[]
  }
}

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const assignmentFieldsSchema = z.object({
  courseId: z.preprocess(emptyToUndefined, z.string().min(1, "Course is required")),
  title: z.string().trim().min(1, "Assignment title is required"),
  description: z.preprocess(emptyToUndefined, z.string().optional()),
  startDate: z.preprocess(emptyToUndefined, z.string().optional()),
  startTime: z.preprocess(emptyToUndefined, z.string().optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
  endTime: z.preprocess(emptyToUndefined, z.string().optional()),
})

const createAssignmentSchema = assignmentFieldsSchema.superRefine((data, ctx) => {
  if (data.startTime && !data.startDate) {
    ctx.addIssue({
      path: ["startTime"],
      code: z.ZodIssueCode.custom,
      message: "Start date is required when a start time is provided",
    })
  }

  if (data.endTime && !data.endDate) {
    ctx.addIssue({
      path: ["endTime"],
      code: z.ZodIssueCode.custom,
      message: "End date is required when an end time is provided",
    })
  }

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      path: ["endDate"],
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
    })
  }
})

function isoFromDateTime(date: string, time: string, endOfDayFallback = false) {
  const normalizedTime = time?.trim()
  if (normalizedTime) {
    // Accept "HH:mm" or "HH:mm:ss"
    const full = normalizedTime.length === 5 ? `${normalizedTime}:00.000Z` : `${normalizedTime}.000Z`
    return new Date(`${date}T${full}`).toISOString()
  }

  return new Date(`${date}T${endOfDayFallback ? "23:59:59.999Z" : "00:00:00.000Z"}`).toISOString()
}

export async function createAssignmentAction(
  _prevState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const grader = await requireGraderUser()

  const parsed = createAssignmentSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    startTime: formData.get("startTime"),
    endDate: formData.get("endDate"),
    endTime: formData.get("endTime"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const courseId = Number(parsed.data.courseId)
  if (!Number.isFinite(courseId)) {
    return { errors: { courseId: ["Invalid course id"] } }
  }

  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, grader.id),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  if (!membership[0]) {
    return { errors: { _form: ["You do not have permission to create assignments for this course."] } }
  }

  const courseRows = await db
    .select({ startDate: courses.startDate, endDate: courses.endDate })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  const course = courseRows[0]
  if (!course) {
    return { errors: { _form: ["Course not found."] } }
  }

  const courseStartAt = new Date(`${course.startDate}T00:00:00.000Z`).getTime()
  const courseEndAt = new Date(`${course.endDate}T23:59:59.999Z`).getTime()

  const releaseAt = parsed.data.startDate
    ? isoFromDateTime(parsed.data.startDate, parsed.data.startTime ?? "", false)
    : new Date().toISOString()

  // If the user does not provide an end date/time, default to the course end.
  const dueAt = parsed.data.endDate
    ? isoFromDateTime(parsed.data.endDate, parsed.data.endTime ?? "", true)
    : new Date(courseEndAt).toISOString()

  const releaseAtMs = new Date(releaseAt).getTime()
  const dueAtMs = new Date(dueAt).getTime()

  // Even when users omit dates, the derived start/end must still be feasible.
  // If the course already ended, we cannot default an assignment start to "now".
  if (!parsed.data.startDate && !parsed.data.endDate && releaseAtMs > courseEndAt) {
    return {
      errors: {
        _form: [
          "Course has already ended. Cannot create an assignment that starts after the course end date.",
        ],
      },
    }
  }

  if (Number.isFinite(releaseAtMs) && Number.isFinite(dueAtMs) && releaseAtMs > dueAtMs) {
    return { errors: { endDate: ["End date/time must be on or after start date/time"] } }
  }

  // Only enforce course-range constraints for fields the user explicitly set.
  if (parsed.data.startDate) {
    if (releaseAtMs < courseStartAt) {
      return { errors: { startDate: ["Assignment must start on or after the course start date"] } }
    }
    if (releaseAtMs > courseEndAt) {
      return { errors: { startDate: ["Assignment must start on or before the course end date"] } }
    }
  }

  if (parsed.data.endDate) {
    if (dueAtMs > courseEndAt) {
      return { errors: { endDate: ["Assignment must end on or before the course end date"] } }
    }
    if (dueAtMs < courseStartAt) {
      return { errors: { endDate: ["Assignment must end on or after the course start date"] } }
    }
  }

  await db.insert(assignments).values({
    courseId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    assignmentType: "written",
    totalPoints: 100,
    releaseAt,
    dueAt,
    lateUntil: null,
    submissionType: "text",
    allowResubmissions: false,
    maxAttemptResubmission: 0,
    isPublished: false,
    createdByUserId: grader.id,
  })

  revalidatePath(`/courses/${courseId}`)
  redirect(`/courses/${courseId}`)
}

