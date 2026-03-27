import { and, asc, desc, eq, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db/orm"
import {
  assignmentRubricItems,
  assignments,
  courseMemberships,
  courses,
  grades,
  rubricScores,
  submissions,
  users,
} from "@/db/schema"
import { flattenRubricItems, parseRubricJson } from "@/lib/rubrics"

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

export type CourseViewerRole = "Instructor" | "Student"

export type CourseDetail = {
  id: number
  title: string
  startDate: string
  endDate: string
  instructors: string[]
  viewerRole: CourseViewerRole
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
  releaseAt: string
  totalPoints: number
  description: string | null
  courseId: number
  courseTitle: string
  allowResubmissions: boolean
  maxAttemptResubmission: number
}

export type AssessmentMemberDetail = AssessmentDetail & {
  viewerRole: CourseViewerRole
}

export type AssessmentRubricDetail = AssessmentDetail & {
  viewerRole: CourseViewerRole
  rubricJson: unknown | null
}

export type SubmissionSummary = {
  id: number
  studentMembershipId: number
  studentName: string
  studentEmail: string
  status: string
  submittedAt: string
  attemptNumber: number
  fileUrl: string | null
}

export type MemberSubmissionHistoryItem = {
  id: number
  attemptNumber: number
  status: string
  submittedAt: string
  fileUrl: string | null
  isCurrent: boolean
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

export type SubmissionGradeQuestion = {
  questionId: string
  questionName: string
  maxScore: number
  rubricItems: Array<{
    order: number
    criterion: string
    rubricName: string
    maxScore: number
  }>
}

export type SubmissionGrade = {
  id: number
  totalScore: number
  overallFeedback: string | null
  gradedAt: string
  rubricScores: Array<{
    displayOrder: number
    pointsAwarded: number
  }>
}

export type SubmissionGradeDetail = SubmissionDetail & {
  totalPoints: number
  rubricQuestions: SubmissionGradeQuestion[]
  grade: SubmissionGrade | null
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
      viewerRole: sql<CourseViewerRole>`case when ${myMembership.role} = 'student' then 'Student' else 'Instructor' end`,
    })
    .from(courses)
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.status, "active"),
      ),
    )
    .leftJoin(member, eq(member.courseId, courses.id))
    .leftJoin(memberUser, eq(memberUser.id, member.userId))
    .where(eq(courses.id, courseId))
    .groupBy(courses.id, myMembership.role)
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    instructors: (row.instructors as string[]) ?? [],
    viewerRole: row.viewerRole === "Student" ? "Student" : "Instructor",
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

export async function getAssessmentForCourseMember(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<AssessmentMemberDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      releaseAt: assignments.releaseAt,
      dueAt: assignments.dueAt,
      totalPoints: assignments.totalPoints,
      courseId: courses.id,
      courseTitle: courses.title,
      allowResubmissions: assignments.allowResubmissions,
      maxAttemptResubmission: assignments.maxAttemptResubmission,
      viewerRole: sql<CourseViewerRole>`case when ${myMembership.role} = 'student' then 'Student' else 'Instructor' end`,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
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
    totalPoints: Number(row.totalPoints),
    description: row.description ? String(row.description) : null,
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
    allowResubmissions: Boolean(row.allowResubmissions),
    maxAttemptResubmission: Number(row.maxAttemptResubmission ?? 0),
    viewerRole: row.viewerRole === "Student" ? "Student" : "Instructor",
  }
}

export async function getAssessmentRubricForMember(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<AssessmentRubricDetail | null> {
  const myMembership = alias(courseMemberships, "my_membership")
  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      releaseAt: assignments.releaseAt,
      dueAt: assignments.dueAt,
      totalPoints: assignments.totalPoints,
      courseId: courses.id,
      courseTitle: courses.title,
      rubricJson: assignments.rubricJson,
      allowResubmissions: assignments.allowResubmissions,
      maxAttemptResubmission: assignments.maxAttemptResubmission,
      viewerRole: sql<CourseViewerRole>`case when ${myMembership.role} = 'student' then 'Student' else 'Instructor' end`,
    })
    .from(assignments)
    .innerJoin(courses, eq(courses.id, assignments.courseId))
    .innerJoin(
      myMembership,
      and(
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
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
    totalPoints: Number(row.totalPoints),
    description: row.description ? String(row.description) : null,
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
    rubricJson: row.rubricJson ?? null,
    allowResubmissions: Boolean(row.allowResubmissions),
    maxAttemptResubmission: Number(row.maxAttemptResubmission ?? 0),
    viewerRole: row.viewerRole === "Student" ? "Student" : "Instructor",
  }
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
      totalPoints: assignments.totalPoints,
      courseId: courses.id,
      courseTitle: courses.title,
      allowResubmissions: assignments.allowResubmissions,
      maxAttemptResubmission: assignments.maxAttemptResubmission,
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
    totalPoints: Number(row.totalPoints),
    description: row.description ? String(row.description) : null,
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
    allowResubmissions: Boolean(row.allowResubmissions),
    maxAttemptResubmission: Number(row.maxAttemptResubmission ?? 0),
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
      studentMembershipId: submissions.studentMembershipId,
      attemptNumber: submissions.attemptNumber,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      fileUrl: submissions.fileUrl,
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
    .orderBy(desc(submissions.attemptNumber))

  return rows.map((row) => ({
    id: Number(row.id),
    studentMembershipId: Number(row.studentMembershipId),
    attemptNumber: Number(row.attemptNumber),
    status: String(row.status),
    submittedAt: String(row.submittedAt),
    fileUrl: row.fileUrl ? String(row.fileUrl) : null,
    studentName: String(row.studentName),
    studentEmail: String(row.studentEmail),
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

export async function getSubmissionGradeForGrader(
  userId: number,
  courseId: number,
  assignmentId: number,
  submissionId: number,
): Promise<SubmissionGradeDetail | null> {
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
      totalPoints: assignments.totalPoints,
      rubricJson: assignments.rubricJson,
      courseId: courses.id,
      courseTitle: courses.title,
      gradeId: grades.id,
      gradeTotalScore: grades.totalScore,
      gradeOverallFeedback: grades.overallFeedback,
      gradeGradedAt: grades.gradedAt,
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
    .leftJoin(grades, eq(grades.submissionId, submissions.id))
    .where(and(eq(courses.id, courseId), eq(assignments.id, assignmentId), eq(submissions.id, submissionId)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const rubric = parseRubricJson(row.rubricJson)
  const flattenedItems = rubric ? flattenRubricItems(rubric) : []
  const rubricQuestions = rubric
    ? rubric.questions.map((question, questionIndex) => {
        const items = flattenedItems
          .filter((item) => item.question_order === questionIndex)
          .map((item) => ({
            order: item.order,
            criterion: item.criterion,
            rubricName: item.rubric_name,
            maxScore: item.max_score,
          }))

        return {
          questionId: question.question_id,
          questionName: question.question_name,
          maxScore: items.reduce((sum, item) => sum + item.maxScore, 0),
          rubricItems: items,
        }
      })
    : []

  let grade: SubmissionGrade | null = null
  if (row.gradeId) {
    const scoreRows = await db
      .select({
        displayOrder: assignmentRubricItems.displayOrder,
        pointsAwarded: rubricScores.pointsAwarded,
      })
      .from(rubricScores)
      .innerJoin(assignmentRubricItems, eq(assignmentRubricItems.id, rubricScores.rubricItemId))
      .where(eq(rubricScores.gradeId, Number(row.gradeId)))
      .orderBy(asc(assignmentRubricItems.displayOrder))

    grade = {
      id: Number(row.gradeId),
      totalScore: Number(row.gradeTotalScore ?? 0),
      overallFeedback: row.gradeOverallFeedback ? String(row.gradeOverallFeedback) : null,
      gradedAt: String(row.gradeGradedAt),
      rubricScores: scoreRows.map((scoreRow) => ({
        displayOrder: Number(scoreRow.displayOrder),
        pointsAwarded: Number(scoreRow.pointsAwarded),
      })),
    }
  }

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
    totalPoints: Number(row.totalPoints),
    courseId: Number(row.courseId),
    courseTitle: String(row.courseTitle),
    rubricQuestions,
    grade,
  }
}

export async function listMemberSubmissionHistory(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<MemberSubmissionHistoryItem[]> {
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
        eq(myMembership.courseId, courses.id),
        eq(myMembership.userId, userId),
        eq(myMembership.status, "active"),
        eq(submissions.studentMembershipId, myMembership.id),
      ),
    )
    .where(and(eq(courses.id, courseId), eq(assignments.id, assignmentId)))
    .orderBy(desc(submissions.attemptNumber), desc(submissions.submittedAt))

  return rows.map((row, index) => ({
    id: Number(row.id),
    attemptNumber: Number(row.attemptNumber),
    status: String(row.status),
    submittedAt: String(row.submittedAt),
    fileUrl: row.fileUrl ? String(row.fileUrl) : null,
    isCurrent: index === 0,
  }))
}
