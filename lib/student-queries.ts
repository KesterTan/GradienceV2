import { and, asc, desc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db/orm"
import { assignments, courseMemberships, courses, submissions, users } from "@/db/schema"

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

export type StudentCourseSummary = {
  id: number
  title: string
  courseCode: string
  term: string
  startDate: string
  endDate: string
  instructors: string[]
  publishedAssignmentCount: number
}

/**
 * Returns all courses the student is actively enrolled in.
 */
export async function listCoursesForStudent(userId: number): Promise<StudentCourseSummary[]> {
  const myMembership = alias(courseMemberships, "my_membership")
  const member = alias(courseMemberships, "member")
  const memberUser = alias(users, "member_user")

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      courseCode: courses.courseCode,
      term: courses.term,
      startDate: courses.startDate,
      endDate: courses.endDate,
      instructors: sql<string[]>`coalesce(array_agg(distinct trim(${memberUser.firstName} || ' ' || ${memberUser.lastName})) filter (where ${member.role} = 'grader' and ${member.status} = 'active'), ARRAY[]::text[])`,
      publishedAssignmentCount: sql<number>`count(distinct ${assignments.id}) filter (where ${assignments.isPublished} = true)`,
    })
    .from(courses)
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "student"),
        eq(myMembership.status, "active"),
      ),
    )
    .leftJoin(member, eq(member.courseId, courses.id))
    .leftJoin(memberUser, eq(memberUser.id, member.userId))
    .leftJoin(assignments, eq(assignments.courseId, courses.id))
    .groupBy(courses.id)
    .orderBy(desc(courses.createdAt))

  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    courseCode: String(row.courseCode),
    term: String(row.term),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    instructors: (row.instructors as string[]) ?? [],
    publishedAssignmentCount: Number(row.publishedAssignmentCount),
  }))
}

export type StudentCourseDetail = {
  id: number
  title: string
  courseCode: string
  term: string
  description: string | null
  startDate: string
  endDate: string
  instructors: string[]
}

export type StudentAssignmentSummary = {
  id: number
  title: string
  description: string | null
  dueAt: string
  totalPoints: number
  submissionStatus: "not_submitted" | "submitted" | "late" | "resubmitted" | "graded"
  latestAttemptNumber: number | null
}

/**
 * Returns course details for a student, provided they are an active member.
 */
export async function getCourseForStudent(
  userId: number,
  courseId: number,
): Promise<StudentCourseDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")
  const member = alias(courseMemberships, "member")
  const memberUser = alias(users, "member_user")

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      courseCode: courses.courseCode,
      term: courses.term,
      description: courses.description,
      startDate: courses.startDate,
      endDate: courses.endDate,
      instructors: sql<string[]>`coalesce(array_agg(distinct trim(${memberUser.firstName} || ' ' || ${memberUser.lastName})) filter (where ${member.role} = 'grader' and ${member.status} = 'active'), ARRAY[]::text[])`,
    })
    .from(courses)
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "student"),
        eq(myMembership.status, "active"),
      ),
    )
    .leftJoin(member, eq(member.courseId, courses.id))
    .leftJoin(memberUser, eq(memberUser.id, member.userId))
    .where(eq(courses.id, courseId))
    .groupBy(courses.id)
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    courseCode: String(row.courseCode),
    term: String(row.term),
    description: row.description ? String(row.description) : null,
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    instructors: (row.instructors as string[]) ?? [],
  }
}

/**
 * Returns all published assignments for a course, with the student's latest
 * submission status for each. "not_submitted" means no submission exists yet.
 */
export async function listAssignmentsForStudent(
  userId: number,
  courseId: number,
): Promise<StudentAssignmentSummary[]> {
  const myMembership = alias(courseMemberships, "my_membership")

  // Fetch membership id separately so we can filter submissions to this student only
  const membershipRows = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.role, "student"),
        eq(courseMemberships.status, "active"),
      ),
    )
    .limit(1)

  const membershipId = membershipRows[0]?.id
  if (!membershipId) return []

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      totalPoints: assignments.totalPoints,
      latestStatus: sql<string | null>`(
        select ${submissions.status}
        from gradience.submissions
        where ${submissions.assignmentId} = ${assignments.id}
          and ${submissions.studentMembershipId} = ${membershipId}
        order by ${submissions.attemptNumber} desc
        limit 1
      )`,
      latestAttempt: sql<number | null>`(
        select max(${submissions.attemptNumber})
        from gradience.submissions
        where ${submissions.assignmentId} = ${assignments.id}
          and ${submissions.studentMembershipId} = ${membershipId}
      )`,
    })
    .from(assignments)
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, assignments.courseId),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "student"),
        eq(myMembership.status, "active"),
      ),
    )
    .where(
      and(
        eq(assignments.courseId, courseId),
        eq(assignments.isPublished, true),
      ),
    )
    .orderBy(asc(assignments.dueAt))

  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    dueAt: String(row.dueAt),
    totalPoints: Number(row.totalPoints),
    submissionStatus: (row.latestStatus ?? "not_submitted") as StudentAssignmentSummary["submissionStatus"],
    latestAttemptNumber: row.latestAttempt ? Number(row.latestAttempt) : null,
  }))
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
