"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { and, eq } from "drizzle-orm"
import { db } from "@/db/orm"
import { assignments, courseMemberships } from "@/db/schema"
import { requireGraderUser } from "@/lib/current-user"

type AssignmentFormState = {
  errors?: {
    title?: string[]
    description?: string[]
    startDate?: string[]
    endDate?: string[]
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
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
})

const createAssignmentSchema = assignmentFieldsSchema.superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      path: ["endDate"],
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
    })
  }
})

function startOfDayIso(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toISOString()
}

function endOfDayIso(date: string) {
  return new Date(`${date}T23:59:59.999Z`).toISOString()
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
    endDate: formData.get("endDate"),
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

  const releaseAt = parsed.data.startDate ? startOfDayIso(parsed.data.startDate) : new Date().toISOString()
  const dueAt = parsed.data.endDate
    ? endOfDayIso(parsed.data.endDate)
    : new Date(new Date(releaseAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

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

