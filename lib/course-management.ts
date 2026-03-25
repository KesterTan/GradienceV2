import { and, asc, desc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db/orm"
import { assignments, courseMemberships, courses, submissions, users } from "@/db/schema"

export type CourseSummary = {
  id: number
  title: string
  startDate: string
  endDate: string
  instructors: string[]
  studentCount: number
  viewerRole: "Instructor" | "Student"
  assignmentCount: number
}

export type CourseDetail = {
  id: number
  title: string
  startDate: string
  endDate: string
  instructors: string[]
}

export type AssignmentSummary = {
  id: number
  title: string
  description: string | null
  dueAt: string
  submissionCount: number
}

export type AssessmentDetail = {
  id: number
  title: string
  dueAt: string
  lateUntil: string | null
  releaseAt: string
  description: string | null
  courseId: number
  courseTitle: string
}

export type SubmissionSummary = {
  id: number
  studentName: string
  studentEmail: string
  status: string
  submittedAt: string
  attemptNumber: number
}

export type SubmissionDetail = {
  id: number
  attemptNumber: number
  status: string
  submittedAt: string
  textContent: string | null
  fileUrl: string | null
  studentName: string
  studentEmail: string
  assignmentTitle: string
  courseId: number
  courseTitle: string
  assignmentId: number
}

export async function listCoursesForGrader(userId: number): Promise<CourseSummary[]> {
  const member = alias(courseMemberships, "member")
  const myMembership = alias(courseMemberships, "my_membership")
  const memberUser = alias(users, "member_user")

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
      startDate: courses.startDate,
      endDate: courses.endDate,
      instructors: sql<string[]>`coalesce(array_agg(distinct trim(${memberUser.firstName} || ' ' || ${memberUser.lastName})) filter (where ${member.role} = 'grader' and ${member.status} = 'active'), ARRAY[]::text[])`,
      studentCount: sql<number>`count(distinct ${member.userId}) filter (where ${member.role} = 'student' and ${member.status} = 'active')`,
      viewerRole: sql<"Instructor" | "Student">`case when ${myMembership.role} = 'student' then 'Student' else 'Instructor' end`,
      assignmentCount: sql<number>`count(distinct ${assignments.id})`,
    })
    .from(courses)
    .leftJoin(member, eq(member.courseId, courses.id))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .leftJoin(memberUser, eq(memberUser.id, member.userId))
    .leftJoin(assignments, eq(assignments.courseId, courses.id))
    .groupBy(courses.id, myMembership.role)
    .orderBy(desc(courses.createdAt))

  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    instructors: (row.instructors as string[]) ?? [],
    studentCount: Number(row.studentCount),
    viewerRole: row.viewerRole === "Student" ? "Student" : "Instructor",
    assignmentCount: Number(row.assignmentCount),
  }))
}

export async function getCourseForGrader(
  userId: number,
  courseId: number,
): Promise<CourseDetail | null> {
  const member = alias(courseMemberships, "member")
  const myMembership = alias(courseMemberships, "my_membership")
  const memberUser = alias(users, "member_user")

  const rows = await db
    .select({
      id: courses.id,
      title: courses.title,
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
        eq(myMembership.role, "grader"),
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
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    instructors: (row.instructors as string[]) ?? [],
  }
}

export async function listAssignmentsForCourse(
  userId: number,
  courseId: number,
): Promise<AssignmentSummary[]> {
  const myMembership = alias(courseMemberships, "my_membership")
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      dueAt: assignments.dueAt,
      submissionCount: sql<number>`count(${submissions.id})`,
    })
    .from(assignments)
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, assignments.courseId),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(eq(assignments.courseId, courseId))
    .groupBy(assignments.id)
    .orderBy(asc(assignments.dueAt), asc(assignments.createdAt))

  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    dueAt: String(row.dueAt),
    submissionCount: Number(row.submissionCount),
  }))
}

export async function getAssessmentForGrader(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<AssessmentDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      releaseAt: assignments.releaseAt,
      dueAt: assignments.dueAt,
      lateUntil: assignments.lateUntil,
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
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .where(and(eq(courses.id, courseId), eq(assignments.id, assignmentId)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    releaseAt: String(row.releaseAt),
    dueAt: String(row.dueAt),
    lateUntil: row.lateUntil ? String(row.lateUntil) : null,
    description: row.description ? String(row.description) : null,
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
  }
}

export async function listSubmissionsForAssessment(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<SubmissionSummary[]> {
  const myMembership = alias(courseMemberships, "my_membership")
  const studentMembership = alias(courseMemberships, "student_membership")
  const studentUser = alias(users, "student_user")

  const rows = await db
    .select({
      id: submissions.id,
      attemptNumber: submissions.attemptNumber,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      studentEmail: studentUser.email,
      studentName: sql<string>`trim(${studentUser.firstName} || ' ' || ${studentUser.lastName})`,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .innerJoin(
      studentMembership,
      and(eq(studentMembership.id, submissions.studentMembershipId), eq(studentMembership.role, "student")),
    )
    .innerJoin(studentUser, eq(studentUser.id, studentMembership.userId))
    .where(and(eq(courses.id, courseId), eq(assignments.id, assignmentId)))
    .orderBy(desc(submissions.submittedAt))

  return rows.map((row) => ({
    id: Number(row.id),
    attemptNumber: Number(row.attemptNumber),
    status: String(row.status),
    submittedAt: String(row.submittedAt),
    studentName: String(row.studentName),
    studentEmail: String(row.studentEmail),
  }))
}

export type StudentSubmissionRow = {
  studentMembershipId: number
  studentName: string
  studentEmail: string
  totalAttempts: number
  latestSubmission: {
    id: number
    attemptNumber: number
    status: string
    submittedAt: string
    fileUrl: string | null
  }
}

/**
 * Returns one row per student who has submitted for the given assignment.
 * Each row contains the student's latest submission and total attempt count.
 * Used by the instructor assignment page — replaces the flat all-submissions list.
 */
export async function listStudentsWithLatestSubmission(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<StudentSubmissionRow[]> {
  const myMembership = alias(courseMemberships, "my_membership")
  const studentMembership = alias(courseMemberships, "student_membership")
  const studentUser = alias(users, "student_user")
  const latestSub = alias(submissions, "latest_sub")

  const rows = await db
    .select({
      studentMembershipId: studentMembership.id,
      studentName: sql<string>`trim(${studentUser.firstName} || ' ' || ${studentUser.lastName})`,
      studentEmail: studentUser.email,
      totalAttempts: sql<number>`(
        select count(*) from gradience.submissions s2
        where s2.assignment_id = ${latestSub.assignmentId}
          and s2.student_membership_id = ${latestSub.studentMembershipId}
      )`,
      latestId: latestSub.id,
      latestAttemptNumber: latestSub.attemptNumber,
      latestStatus: latestSub.status,
      latestSubmittedAt: latestSub.submittedAt,
      latestFileUrl: latestSub.fileUrl,
    })
    .from(latestSub)
    .innerJoin(assignments, eq(assignments.id, latestSub.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .innerJoin(studentMembership, eq(studentMembership.id, latestSub.studentMembershipId))
    .innerJoin(studentUser, eq(studentUser.id, studentMembership.userId))
    .where(
      and(
        eq(courses.id, courseId),
        eq(assignments.id, assignmentId),
        sql`${latestSub.attemptNumber} = (
          select max(s2.attempt_number) from gradience.submissions s2
          where s2.assignment_id = ${latestSub.assignmentId}
            and s2.student_membership_id = ${latestSub.studentMembershipId}
        )`,
      ),
    )
    .orderBy(sql<string>`trim(${studentUser.firstName} || ' ' || ${studentUser.lastName})`)

  return rows.map((row) => ({
    studentMembershipId: Number(row.studentMembershipId),
    studentName: String(row.studentName),
    studentEmail: String(row.studentEmail),
    totalAttempts: Number(row.totalAttempts),
    latestSubmission: {
      id: Number(row.latestId),
      attemptNumber: Number(row.latestAttemptNumber),
      status: String(row.latestStatus),
      submittedAt: String(row.latestSubmittedAt),
      fileUrl: row.latestFileUrl ? String(row.latestFileUrl) : null,
    },
  }))
}

export async function getSubmissionForGrader(
  userId: number,
  courseId: number,
  assignmentId: number,
  submissionId: number,
): Promise<SubmissionDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")
  const studentMembership = alias(courseMemberships, "student_membership")
  const studentUser = alias(users, "student_user")

  const rows = await db
    .select({
      id: submissions.id,
      attemptNumber: submissions.attemptNumber,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      textContent: submissions.textContent,
      fileUrl: submissions.fileUrl,
      studentName: sql<string>`trim(${studentUser.firstName} || ' ' || ${studentUser.lastName})`,
      studentEmail: studentUser.email,
      assignmentId: assignments.id,
      assignmentTitle: assignments.title,
      courseId: courses.id,
      courseTitle: courses.title,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.role, "grader"),
        eq(myMembership.status, "active"),
      ),
    )
    .innerJoin(
      studentMembership,
      and(eq(studentMembership.id, submissions.studentMembershipId), eq(studentMembership.role, "student")),
    )
    .innerJoin(studentUser, eq(studentUser.id, studentMembership.userId))
    .where(and(eq(courses.id, courseId), eq(assignments.id, assignmentId), eq(submissions.id, submissionId)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    attemptNumber: Number(row.attemptNumber),
    status: String(row.status),
    submittedAt: String(row.submittedAt),
    textContent: row.textContent ? String(row.textContent) : null,
    fileUrl: row.fileUrl ? String(row.fileUrl) : null,
    studentName: String(row.studentName),
    studentEmail: String(row.studentEmail),
    assignmentId: Number(row.assignmentId),
    assignmentTitle: String(row.assignmentTitle),
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
  }
}
