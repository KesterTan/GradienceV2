"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/db/orm"
import { courseMemberships, courses } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"

export type CourseFormState = {
  errors?: {
    title?: string[]
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

const courseFieldsSchema = z.object({
  title: z.string().trim().min(1, "Course title is required"),
  startDate: z.preprocess(emptyToUndefined, z.string().optional()),
  endDate: z.preprocess(emptyToUndefined, z.string().optional()),
})

const createSchema = courseFieldsSchema.superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      path: ["endDate"],
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
    })
  }
})

function createCode(title: string) {
  const stem = title
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("")
    .slice(0, 6) || "CRS"

  const suffix = Date.now().toString().slice(-6)
  return `${stem}-${suffix}`
}

function termFromDate(startDate?: string) {
  if (!startDate) return "Self-paced"

  const year = new Date(startDate).getFullYear()
  if (Number.isNaN(year)) return "Self-paced"

  return `Term ${year}`
}

export async function createCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const user = await requireAppUser()

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { title, startDate, endDate } = parsed.data

  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(courses)
      .values({
        title,
        courseCode: createCode(title),
        term: termFromDate(startDate),
        description: null,
        createdByUserId: user.id,
        startDate: startDate ?? new Date().toISOString().slice(0, 10),
        endDate: endDate ?? startDate ?? new Date().toISOString().slice(0, 10),
      })
      .returning({ id: courses.id })

    const courseId = inserted[0].id

    await tx
      .insert(courseMemberships)
      .values({
        courseId,
        userId: user.id,
        role: "grader",
        status: "active",
      })
      .onConflictDoUpdate({
        target: [courseMemberships.courseId, courseMemberships.userId],
        set: {
          role: "grader",
          status: "active",
        },
      })
  })

  revalidatePath("/courses")
  redirect("/courses")
}
