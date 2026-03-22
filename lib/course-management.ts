import { query } from "@/db/db"

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
  dueAt: string
  submissionCount: number
}

export type AssessmentDetail = {
  id: number
  title: string
  dueAt: string
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
  const result = await query(
    `SELECT
       c.id,
       c.title,
       c.start_date::text AS start_date,
       c.end_date::text AS end_date,
       COALESCE(
         ARRAY_AGG(DISTINCT TRIM(u.first_name || ' ' || u.last_name))
           FILTER (WHERE cm.role = 'grader' AND cm.status = 'active'),
         ARRAY[]::text[]
       ) AS instructors,
       COUNT(DISTINCT cm.user_id) FILTER (WHERE cm.role = 'student' AND cm.status = 'active')::int AS student_count,
       CASE
         WHEN my.role = 'student' THEN 'Student'
         ELSE 'Instructor'
       END AS viewer_role,
       COUNT(DISTINCT a.id)::int AS assignment_count
     FROM gradience.courses c
     LEFT JOIN gradience.course_memberships cm
       ON cm.course_id = c.id
     LEFT JOIN gradience.course_memberships my
       ON my.course_id = c.id
      AND my.user_id = $1
      AND my.status = 'active'
     LEFT JOIN gradience.users u
       ON u.id = cm.user_id
     LEFT JOIN gradience.assignments a
       ON a.course_id = c.id
     GROUP BY c.id, my.role
     ORDER BY c.created_at DESC`,
    [userId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    instructors: (row.instructors as string[]) ?? [],
    studentCount: Number(row.student_count),
    viewerRole: (row.viewer_role === "Student" ? "Student" : "Instructor") as "Instructor" | "Student",
    assignmentCount: Number(row.assignment_count),
  }))
}

export async function getCourseForGrader(
  userId: number,
  courseId: number,
): Promise<CourseDetail | null> {
  void userId
  const result = await query(
    `SELECT
       c.id,
       c.title,
       c.start_date::text AS start_date,
       c.end_date::text AS end_date,
       COALESCE(
         ARRAY_AGG(DISTINCT TRIM(u.first_name || ' ' || u.last_name))
           FILTER (WHERE cm.role = 'grader' AND cm.status = 'active'),
         ARRAY[]::text[]
       ) AS instructors
     FROM gradience.courses c
     LEFT JOIN gradience.course_memberships cm
       ON cm.course_id = c.id
     LEFT JOIN gradience.users u
       ON u.id = cm.user_id
     WHERE c.id = $1
     GROUP BY c.id
     LIMIT 1`,
    [courseId],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    instructors: (row.instructors as string[]) ?? [],
  }
}

export async function listAssignmentsForCourse(
  userId: number,
  courseId: number,
): Promise<AssignmentSummary[]> {
  void userId
  const result = await query(
    `SELECT
       a.id,
       a.title,
       a.due_at::text AS due_at,
       COUNT(s.id)::int AS submission_count
     FROM gradience.assignments a
     JOIN gradience.courses c ON c.id = a.course_id
     LEFT JOIN gradience.submissions s
       ON s.assignment_id = a.id
     WHERE c.id = $1
     GROUP BY a.id
     ORDER BY a.due_at ASC, a.created_at ASC`,
    [courseId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    dueAt: String(row.due_at),
    submissionCount: Number(row.submission_count),
  }))
}

export async function getAssessmentForGrader(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<AssessmentDetail | null> {
  void userId
  const result = await query(
    `SELECT
       a.id,
       a.title,
       a.description,
       a.due_at::text AS due_at,
       c.id AS course_id,
       c.title AS course_title
     FROM gradience.assignments a
     JOIN gradience.courses c
       ON c.id = a.course_id
     WHERE c.id = $1 AND a.id = $2
     LIMIT 1`,
    [courseId, assignmentId],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    title: String(row.title),
    dueAt: String(row.due_at),
    description: row.description ? String(row.description) : null,
    courseId: Number(row.course_id),
    courseTitle: String(row.course_title),
  }
}

export async function listSubmissionsForAssessment(
  userId: number,
  courseId: number,
  assignmentId: number,
): Promise<SubmissionSummary[]> {
  void userId
  const result = await query(
    `SELECT
       s.id,
       s.attempt_number,
       s.status,
       s.submitted_at::text AS submitted_at,
       stu.email AS student_email,
       TRIM(stu.first_name || ' ' || stu.last_name) AS student_name
     FROM gradience.submissions s
     JOIN gradience.assignments a
       ON a.id = s.assignment_id
     JOIN gradience.courses c
       ON c.id = a.course_id
     JOIN gradience.course_memberships cm_student
       ON cm_student.id = s.student_membership_id
      AND cm_student.role = 'student'
     JOIN gradience.users stu
       ON stu.id = cm_student.user_id
     WHERE c.id = $1
       AND a.id = $2
     ORDER BY s.submitted_at DESC`,
    [courseId, assignmentId],
  )

  return result.rows.map((row) => ({
    id: Number(row.id),
    attemptNumber: Number(row.attempt_number),
    status: String(row.status),
    submittedAt: String(row.submitted_at),
    studentName: String(row.student_name),
    studentEmail: String(row.student_email),
  }))
}

export async function getSubmissionForGrader(
  userId: number,
  courseId: number,
  assignmentId: number,
  submissionId: number,
): Promise<SubmissionDetail | null> {
  void userId
  const result = await query(
    `SELECT
       s.id,
       s.attempt_number,
       s.status,
       s.submitted_at::text AS submitted_at,
       s.text_content,
       s.file_url,
       TRIM(stu.first_name || ' ' || stu.last_name) AS student_name,
       stu.email AS student_email,
       a.id AS assignment_id,
       a.title AS assignment_title,
       c.id AS course_id,
       c.title AS course_title
     FROM gradience.submissions s
     JOIN gradience.assignments a
       ON a.id = s.assignment_id
     JOIN gradience.courses c
       ON c.id = a.course_id
     JOIN gradience.course_memberships cm_student
       ON cm_student.id = s.student_membership_id
      AND cm_student.role = 'student'
     JOIN gradience.users stu
       ON stu.id = cm_student.user_id
     WHERE c.id = $1
       AND a.id = $2
       AND s.id = $3
     LIMIT 1`,
    [courseId, assignmentId, submissionId],
  )

  const row = result.rows[0]
  if (!row) return null

  return {
    id: Number(row.id),
    attemptNumber: Number(row.attempt_number),
    status: String(row.status),
    submittedAt: String(row.submitted_at),
    textContent: row.text_content ? String(row.text_content) : null,
    fileUrl: row.file_url ? String(row.file_url) : null,
    studentName: String(row.student_name),
    studentEmail: String(row.student_email),
    assignmentId: Number(row.assignment_id),
    assignmentTitle: String(row.assignment_title),
    courseId: Number(row.course_id),
    courseTitle: String(row.course_title),
  }
}
