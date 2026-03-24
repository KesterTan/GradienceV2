import { and, asc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db/orm"
import { assignments, courseMemberships, courses, submissions } from "@/db/schema"

export type StudentAssignmentDetail = {
  id: number
  title: string
  description: string | null
  dueAt: string
  lateUntil: string | null
  releaseAt: string
  totalPoints: number
  submissionType: string
  allowResubmissions: boolean
  courseId: number
  courseTitle: string
}

export type StudentSubmissionSummary = {
  id: number
  attemptNumber: number
  status: string
  submittedAt: string
  fileUrl: string | null
}

/**
 * Returns assignment details for a student, provided they are an active
 * member of the course and the assignment is published.
 * Returns null if the assignment doesn't exist, isn't published, or the
 * student isn't enrolled.
 */
export async function getAssignmentForStudent(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<StudentAssignmentDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      lateUntil: assignments.lateUntil,
      releaseAt: assignments.releaseAt,
      totalPoints: assignments.totalPoints,
      submissionType: assignments.submissionType,
      allowResubmissions: assignments.allowResubmissions,
      courseId: courses.id,
      courseTitle: courses.title,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "student"),
        eq(myMembership.status, "active"),
      ),
    )
    .where(
      and(
        eq(courses.id, courseId),
        eq(assignments.id, assignmentId),
        eq(assignments.isPublished, true),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    dueAt: String(row.dueAt),
    lateUntil: row.lateUntil ? String(row.lateUntil) : null,
    releaseAt: String(row.releaseAt),
    totalPoints: Number(row.totalPoints),
    submissionType: String(row.submissionType),
    allowResubmissions: Boolean(row.allowResubmissions),
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
  }
}

/**
 * Returns all submissions the student has made for a given assignment,
 * ordered by attemptNumber ascending (oldest first).
 *
 * An empty array means the student has never submitted.
 * This is the source of truth for the version history — every upload
 * appends a new entry here rather than overwriting.
 */
export async function listSubmissionsForStudent(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<StudentSubmissionSummary[]> {
  const myMembership = alias(courseMemberships, "my_membership")

  const rows = await db
    .select({
      id: submissions.id,
      attemptNumber: submissions.attemptNumber,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      fileUrl: submissions.fileUrl,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.id, submissions.studentMembershipId),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "student"),
        eq(myMembership.status, "active"),
      ),
    )
    .where(
      and(
        eq(courses.id, courseId),
        eq(assignments.id, assignmentId),
      ),
    )
    .orderBy(asc(submissions.attemptNumber))

  return rows.map((row) => ({
    id: Number(row.id),
    attemptNumber: Number(row.attemptNumber),
    status: String(row.status),
    submittedAt: String(row.submittedAt),
    fileUrl: row.fileUrl ? String(row.fileUrl) : null,
  }))
}

/**
 * Returns the submission with the highest attemptNumber (the active version).
 * Derived from the list — no extra DB query.
 */
export function getLatestSubmission(
  submissions: StudentSubmissionSummary[],
): StudentSubmissionSummary | null {
  if (submissions.length === 0) return null
  return submissions[submissions.length - 1]
}
