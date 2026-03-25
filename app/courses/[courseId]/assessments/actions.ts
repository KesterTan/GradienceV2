"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships, courses } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

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
    assignmentId?: string[]
    _form?: string[]
  }
  values?: {
    courseId: string
    assignmentId?: string
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

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
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
  lateUntilDate: z.preprocess(emptyToUndefined, z.string().optional()),
  lateUntilTime: z.preprocess(emptyToUndefined, z.string().optional()),
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

  if (data.lateUntilTime && !data.lateUntilDate) {
    ctx.addIssue({
      path: ["lateUntilTime"],
      code: z.ZodIssueCode.custom,
      message: "Late until date is required when a late until time is provided",
    })
  }

  if (data.lateUntilDate && data.endDate) {
    if (data.lateUntilDate < data.endDate) {
      ctx.addIssue({
        path: ["lateUntilDate"],
        code: z.ZodIssueCode.custom,
        message: "Late until date must be on or after the end date",
      })
    } else if (data.lateUntilDate === data.endDate) {
      // Same day — compare times
      const parseMinutes = (value: string | undefined) => {
        if (!value?.trim()) return null
        const parts = value.trim().split(":")
        const h = Number(parts[0])
        const m = Number(parts[1] ?? 0)
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
      }
      const endMinutes = parseMinutes(data.endTime)
      const lateMinutes = parseMinutes(data.lateUntilTime)
      if (endMinutes !== null && lateMinutes !== null && lateMinutes <= endMinutes) {
        ctx.addIssue({
          path: ["lateUntilTime"],
          code: z.ZodIssueCode.custom,
          message: "Late until time must be after the end time when on the same day",
        })
      }
    }
  }

  const startDate = data.startDate
  const endDate = data.endDate
  const startTime = data.startTime
  const endTime = data.endTime
  if (startDate && endDate && startDate === endDate && startTime && endTime) {
    const parseMinutes = (value: string) => {
      const parts = value.trim().split(":")
      const h = Number(parts[0])
      const m = Number(parts[1] ?? 0)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
      return h * 60 + m
    }

    const startMinutes = parseMinutes(startTime)
    const endMinutes = parseMinutes(endTime)
    if (Number.isFinite(startMinutes) && Number.isFinite(endMinutes) && endMinutes < startMinutes) {
      ctx.addIssue({
        path: ["endTime"],
        code: z.ZodIssueCode.custom,
        message: "End time must be on or after start time when start and end date are the same",
      })
    }
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

async function requireActiveGraderMembership(courseId: number, userId: number) {
  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  return membership[0] ?? null
}

async function getCourseDateRange(courseId: number) {
  const courseRows = await db
    .select({ startDate: courses.startDate, endDate: courses.endDate })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  return courseRows[0] ?? null
}

function validateWithinCourseRange(params: {
  courseStartAt: number
  courseEndAt: number
  releaseAtMs: number
  dueAtMs: number
  hasExplicitStart: boolean
  hasExplicitEnd: boolean
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
}) {
  const {
    courseStartAt,
    courseEndAt,
    releaseAtMs,
    dueAtMs,
    hasExplicitStart,
    hasExplicitEnd,
    startDate,
    endDate,
    startTime,
    endTime,
  } = params

  const courseStartDate = new Date(courseStartAt).toISOString().slice(0, 10)
  const courseEndDate = new Date(courseEndAt).toISOString().slice(0, 10)
  const courseRangeSuffix = `Valid course date range is ${courseStartDate} to ${courseEndDate}.`

  if (Number.isFinite(releaseAtMs) && Number.isFinite(dueAtMs) && releaseAtMs > dueAtMs) {
    const sameDayTimeConflict = Boolean(
      startDate &&
        endDate &&
        startDate === endDate &&
        startTime?.trim() &&
        endTime?.trim(),
    )

    if (sameDayTimeConflict) {
      return { endTime: ["End time must be on or after start time when start and end date are the same"] }
    }

    return { endDate: ["End date/time must be on or after start date/time"] }
  }

  // Only enforce course-range constraints for fields the user explicitly set.
  if (hasExplicitStart) {
    if (releaseAtMs < courseStartAt) {
      return {
        startDate: [`Assignment must start on or after the course start date. ${courseRangeSuffix}`],
      }
    }
    if (releaseAtMs > courseEndAt) {
      return {
        startDate: [`Assignment must start on or before the course end date. ${courseRangeSuffix}`],
      }
    }
  }

  if (hasExplicitEnd) {
    if (dueAtMs > courseEndAt) {
      return {
        endDate: [`Assignment must end on or before the course end date. ${courseRangeSuffix}`],
      }
    }
    if (dueAtMs < courseStartAt) {
      return {
        endDate: [`Assignment must end on or after the course start date. ${courseRangeSuffix}`],
      }
    }
  }

  return null
}

export async function createAssignmentAction(
  _prevState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const user = await requireAppUser()

  const values = {
    courseId: readFormValue(formData, "courseId"),
    title: readFormValue(formData, "title"),
    description: readFormValue(formData, "description"),
    startDate: readFormValue(formData, "startDate"),
    startTime: readFormValue(formData, "startTime"),
    endDate: readFormValue(formData, "endDate"),
    endTime: readFormValue(formData, "endTime"),
    lateUntilDate: readFormValue(formData, "lateUntilDate"),
    lateUntilTime: readFormValue(formData, "lateUntilTime"),
  }

  const parsed = createAssignmentSchema.safeParse({
    courseId: values.courseId,
    title: values.title,
    description: values.description,
    startDate: values.startDate,
    startTime: values.startTime,
    endDate: values.endDate,
    endTime: values.endTime,
    lateUntilDate: values.lateUntilDate,
    lateUntilTime: values.lateUntilTime,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values }
  }

  const courseId = Number(parsed.data.courseId)
  if (!Number.isFinite(courseId)) {
    return { errors: { courseId: ["Invalid course id"] }, values }
  }

  const membership = await requireActiveGraderMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["You do not have permission to create assignments for this course."] }, values }
  }

  const course = await getCourseDateRange(courseId)
  if (!course) {
    return { errors: { _form: ["Course not found."] }, values }
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
      values,
    }
  }

  const rangeErrors = validateWithinCourseRange({
    courseStartAt,
    courseEndAt,
    releaseAtMs,
    dueAtMs,
    hasExplicitStart: Boolean(parsed.data.startDate),
    hasExplicitEnd: Boolean(parsed.data.endDate),
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  })
  if (rangeErrors) {
    return { errors: rangeErrors, values }
  }

  const lateUntil = parsed.data.lateUntilDate
    ? isoFromDateTime(parsed.data.lateUntilDate, parsed.data.lateUntilTime ?? "", true)
    : null

  await db.insert(assignments).values({
    courseId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    assignmentType: "written",
    totalPoints: 100,
    releaseAt,
    dueAt,
    lateUntil,
    submissionType: "file_upload",
    allowResubmissions: true,
    maxAttemptResubmission: 0,
<<<<<<< HEAD
    isPublished: true,
    createdByUserId: grader.id,
=======
    isPublished: false,
    createdByUserId: user.id,
>>>>>>> main
  })

  revalidatePath(`/courses/${courseId}`)
  redirect(`/courses/${courseId}`)
}

export async function updateAssignmentAction(
  _prevState: AssignmentFormState,
  formData: FormData,
): Promise<AssignmentFormState> {
  const user = await requireAppUser()

  const values = {
    courseId: readFormValue(formData, "courseId"),
    assignmentId: readFormValue(formData, "assignmentId"),
    title: readFormValue(formData, "title"),
    description: readFormValue(formData, "description"),
    startDate: readFormValue(formData, "startDate"),
    startTime: readFormValue(formData, "startTime"),
    endDate: readFormValue(formData, "endDate"),
    endTime: readFormValue(formData, "endTime"),
    lateUntilDate: readFormValue(formData, "lateUntilDate"),
    lateUntilTime: readFormValue(formData, "lateUntilTime"),
  }

  const parsed = createAssignmentSchema.safeParse({
    courseId: values.courseId,
    title: values.title,
    description: values.description,
    startDate: values.startDate,
    startTime: values.startTime,
    endDate: values.endDate,
    endTime: values.endTime,
    lateUntilDate: values.lateUntilDate,
    lateUntilTime: values.lateUntilTime,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors, values }
  }

  const courseId = Number(values.courseId)
  const assignmentId = Number(values.assignmentId)
  if (!Number.isFinite(courseId)) {
    return { errors: { courseId: ["Invalid course id"] }, values }
  }
  if (!Number.isFinite(assignmentId)) {
    return { errors: { assignmentId: ["Invalid assignment id"] }, values }
  }

  const membership = await requireActiveGraderMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["You do not have permission to edit assignments for this course."] }, values }
  }

  const existingRows = await db
    .select({ id: assignments.id, releaseAt: assignments.releaseAt, dueAt: assignments.dueAt })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1)

  const existing = existingRows[0]
  if (!existing) {
    return { errors: { _form: ["Assignment not found."] }, values }
  }

  const course = await getCourseDateRange(courseId)
  if (!course) {
    return { errors: { _form: ["Course not found."] }, values }
  }

  const courseStartAt = new Date(`${course.startDate}T00:00:00.000Z`).getTime()
  const courseEndAt = new Date(`${course.endDate}T23:59:59.999Z`).getTime()

  const releaseAt = parsed.data.startDate
    ? isoFromDateTime(parsed.data.startDate, parsed.data.startTime ?? "", false)
    : new Date().toISOString()

  const dueAt = parsed.data.endDate
    ? isoFromDateTime(parsed.data.endDate, parsed.data.endTime ?? "", true)
    : new Date(courseEndAt).toISOString()

  const releaseAtMs = new Date(releaseAt).getTime()
  const dueAtMs = new Date(dueAt).getTime()

  if (!parsed.data.startDate && !parsed.data.endDate && releaseAtMs > courseEndAt) {
    return {
      errors: {
        _form: [
          "Course has already ended. Cannot update an assignment to start after the course end date.",
        ],
      },
      values,
    }
  }

  const rangeErrors = validateWithinCourseRange({
    courseStartAt,
    courseEndAt,
    releaseAtMs,
    dueAtMs,
    hasExplicitStart: Boolean(parsed.data.startDate),
    hasExplicitEnd: Boolean(parsed.data.endDate),
    startDate: parsed.data.startDate,
    endDate: parsed.data.endDate,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
  })
  if (rangeErrors) {
    return { errors: rangeErrors, values }
  }

  const lateUntil = parsed.data.lateUntilDate
    ? isoFromDateTime(parsed.data.lateUntilDate, parsed.data.lateUntilTime ?? "", true)
    : null

  await db
    .update(assignments)
    .set({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      releaseAt,
      dueAt,
      lateUntil,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(assignments.id, assignmentId))

  revalidatePath(`/courses/${courseId}/assessments/${assignmentId}`)
  revalidatePath(`/courses/${courseId}`)
  redirect(`/courses/${courseId}/assessments/${assignmentId}`)
}
