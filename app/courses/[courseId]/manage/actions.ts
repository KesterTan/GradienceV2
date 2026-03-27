"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { courseMemberships, courses } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export type CourseManageFormState = {
  errors?: {
    title?: string[]
    startDate?: string[]
    endDate?: string[]
    courseId?: string[]
    _form?: string[]
  }
}

export type CourseDeleteState = {
  errors?: {
    courseId?: string[]
    _form?: string[]
  }
}

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const courseFieldsSchema = z.object({
  title: z.string().trim().min(1, "Course title is required"),
  startDate: z.preprocess(emptyToUndefined, z.string().optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
})

const updateCourseSchema = courseFieldsSchema.extend({
  courseId: z.string().trim().min(1, "Course is required"),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      path: ["endDate"],
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
    })
  }
})

function termFromDate(startDate?: string) {
  if (!startDate) return "Self-paced"

  const year = new Date(startDate).getFullYear()
  if (Number.isNaN(year)) return "Self-paced"

  return `Term ${year}`
}

async function requireInstructorMembership(courseId: number, userId: number) {
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

export async function updateCourseAction(
  _prevState: CourseManageFormState,
  formData: FormData,
): Promise<CourseManageFormState> {
  const user = await requireAppUser()

  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const courseId = Number(parsed.data.courseId)
  if (!Number.isFinite(courseId)) {
    return { errors: { courseId: ["Invalid course id"] } }
  }

  const membership = await requireInstructorMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["You do not have permission to edit this course."] } }
  }

  const existingRows = await db
    .select({
      id: courses.id,
      startDate: courses.startDate,
      endDate: courses.endDate,
    })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  const existing = existingRows[0]
  if (!existing) {
    return { errors: { _form: ["Course not found."] } }
  }

  const nextStartDate = parsed.data.startDate ?? String(existing.startDate)
  const nextEndDate = parsed.data.endDate ?? String(existing.endDate)
  if (nextEndDate < nextStartDate) {
    return { errors: { endDate: ["End date must be on or after start date"] } }
  }

  await db
    .update(courses)
    .set({
      title: parsed.data.title,
      startDate: nextStartDate,
      endDate: nextEndDate,
      term: termFromDate(nextStartDate),
    })
    .where(eq(courses.id, courseId))

  revalidatePath("/courses")
  revalidatePath(`/courses/${courseId}`)
  revalidatePath(`/courses/${courseId}/manage`)
  redirect(`/courses/${courseId}`)
}

export async function deleteCourseAction(
  _prevState: CourseDeleteState,
  formData: FormData,
): Promise<CourseDeleteState> {
  const user = await requireAppUser()
  const rawCourseId = formData.get("courseId")
  const courseId = typeof rawCourseId === "string" ? Number(rawCourseId) : NaN

  if (!Number.isFinite(courseId)) {
    return { errors: { courseId: ["Invalid course id"] } }
  }

  const membership = await requireInstructorMembership(courseId, user.id)
  if (!membership) {
    return { errors: { _form: ["You do not have permission to delete this course."] } }
  }

  const existingRows = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1)

  if (!existingRows[0]) {
    return { errors: { _form: ["Course not found."] } }
  }

  await db.delete(courses).where(eq(courses.id, courseId))

  revalidatePath("/courses")
  redirect("/courses")
}
