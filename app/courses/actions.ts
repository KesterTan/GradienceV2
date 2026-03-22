"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withConnection } from "@/db/db"
import { requireGraderUser } from "@/lib/current-user"

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
  const grader = await requireGraderUser()

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { title, startDate, endDate } = parsed.data

  await withConnection(async (client) => {
    await client.query("BEGIN")

    try {
      const { rows } = await client.query<{ id: number }>(
        `INSERT INTO gradience.courses (
           title,
           course_code,
           term,
           description,
           created_by_user_id,
           start_date,
           end_date
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          title,
          createCode(title),
          termFromDate(startDate),
          null,
          grader.id,
          startDate ?? new Date().toISOString().slice(0, 10),
          endDate ?? startDate ?? new Date().toISOString().slice(0, 10),
        ],
      )

      const courseId = rows[0].id

      await client.query(
        `INSERT INTO gradience.course_memberships (course_id, user_id, role, status)
         VALUES ($1, $2, 'grader', 'active')
         ON CONFLICT (course_id, user_id) DO UPDATE
         SET role = EXCLUDED.role,
             status = EXCLUDED.status`,
        [courseId, grader.id],
      )

      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  })

  revalidatePath("/courses")
  redirect("/courses")
}
