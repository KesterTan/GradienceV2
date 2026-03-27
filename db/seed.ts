import "dotenv/config";
import { withConnection } from "./db";

type UserSeed = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  authProviderId: string;
  status: "active" | "inactive" | "invited";
};

type CourseSeed = {
  title: string;
  courseCode: string;
  term: string;
  description: string;
  createdByEmail: string;
  startDate: string;
  endDate: string;
};

type MembershipSeed = {
  courseCode: string;
  userEmail: string;
  role: "grader" | "student";
};

type AssignmentSeed = {
  courseCode: string;
  createdByEmail: string;
  title: string;
  description: string;
  assignmentType: "written" | "programming" | "multiple_choice";
  totalPoints: number;
  releaseAt: string;
  dueAt: string;
  lateUntil: string;
  submissionType: string;
  allowResubmissions: boolean;
  maxAttemptResubmission: number;
  isPublished: boolean;
};

type RubricItemSeed = {
  assignmentTitle: string;
  title: string;
  description: string;
  maxPoints: number;
  displayOrder: number;
  gradingGuidance: string;
};

type SubmissionSeed = {
  assignmentTitle: string;
  studentMembershipKey: string;
  attemptNumber: number;
  submittedAt: string;
  status: "submitted" | "late" | "resubmitted" | "graded";
  textContent: string;
  fileUrl: string;
  aiProcessedStatus: "awaiting" | "processing" | "done" | "failed";
};

type SubmissionFileSeed = {
  submissionTitle: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
};

type GradingAssignmentSeed = {
  submissionTitle: string;
  graderMembershipKey: string;
  status: "pending" | "in_progress" | "completed" | "regraded";
};

type GradeSeed = {
  submissionTitle: string;
  gradedByMembershipKey: string;
  totalScore: number;
  overallFeedback: string;
  isReleasedToStudent: boolean;
  releasedAt: string;
  gradedAt: string;
};

type RubricScoreSeed = {
  gradeKey: string;
  rubricTitle: string;
  pointsAwarded: number;
  comment: string;
};

type FeedbackCommentSeed = {
  submissionTitle: string;
  authorMembershipKey: string;
  rubricTitle?: string;
  commentType: "inline" | "summary";
  content: string;
  pageNumber?: number;
  anchorData?: Record<string, unknown>;
  isVisibleToStudent: boolean;
};

const users: UserSeed[] = [
  {
    firstName: "Irene",
    lastName: "Instructor",
    email: "irene@gradience.edu",
    passwordHash: "$2b$10$instructor",
    authProviderId: "auth0|irene",
    status: "active",
  },
  {
    firstName: "Gary",
    lastName: "Grader",
    email: "gary@gradience.edu",
    passwordHash: "$2b$10$grader",
    authProviderId: "auth0|gary",
    status: "active",
  },
  {
    firstName: "Stu",
    lastName: "Student",
    email: "stu@gradience.edu",
    passwordHash: "$2b$10$student",
    authProviderId: "auth0|stu",
    status: "active",
  },
];

const courses: CourseSeed[] = [
  {
    title: "Intro to AI-Assisted Grading",
    courseCode: "GRAD-101",
    term: "Spring 2026",
    description: "Pilot course for Gradience MVP.",
    createdByEmail: "irene@gradience.edu",
    startDate: "2026-01-15",
    endDate: "2026-05-01",
  },
];

const memberships: MembershipSeed[] = [
  { courseCode: "GRAD-101", userEmail: "irene@gradience.edu", role: "grader" },
  { courseCode: "GRAD-101", userEmail: "gary@gradience.edu", role: "grader" },
  { courseCode: "GRAD-101", userEmail: "stu@gradience.edu", role: "student" },
];

const assignments: AssignmentSeed[] = [
  {
    courseCode: "GRAD-101",
    createdByEmail: "irene@gradience.edu",
    title: "Essay on Human-AI Collaboration",
    description: "Discuss benefits and risks of AI grading.",
    assignmentType: "written",
    totalPoints: 100,
    releaseAt: "2026-02-01T09:00:00-05:00",
    dueAt: "2026-02-15T23:59:00-05:00",
    lateUntil: "2026-02-18T23:59:00-05:00",
    submissionType: "file_upload",
    allowResubmissions: true,
    maxAttemptResubmission: 2,
    isPublished: true,
  },
];

const rubricItems: RubricItemSeed[] = [
  {
    assignmentTitle: "Essay on Human-AI Collaboration",
    title: "Thesis Clarity",
    description: "Is the main argument clear and well-stated?",
    maxPoints: 30,
    displayOrder: 1,
    gradingGuidance: "Look for a clear thesis within first paragraph.",
  },
  {
    assignmentTitle: "Essay on Human-AI Collaboration",
    title: "Evidence Quality",
    description: "Quality and relevance of supporting evidence.",
    maxPoints: 40,
    displayOrder: 2,
    gradingGuidance: "Cite at least three credible sources.",
  },
  {
    assignmentTitle: "Essay on Human-AI Collaboration",
    title: "Writing Mechanics",
    description: "Grammar, spelling, and structure.",
    maxPoints: 30,
    displayOrder: 3,
    gradingGuidance: "Deduct 2 points per major grammar issue.",
  },
];

const submissions: SubmissionSeed[] = [
  {
    assignmentTitle: "Essay on Human-AI Collaboration",
    studentMembershipKey: "GRAD-101:stu@gradience.edu",
    attemptNumber: 1,
    submittedAt: "2026-02-14T20:15:00-05:00",
    status: "submitted",
    textContent: "Full essay text stored here.",
    fileUrl: "https://files.gradience.edu/submissions/essay1.pdf",
    aiProcessedStatus: "processing",
  },
];

const submissionFiles: SubmissionFileSeed[] = [
  {
    submissionTitle: "Essay on Human-AI Collaboration",
    fileUrl: "https://files.gradience.edu/submissions/essay1.pdf",
    mimeType: "application/pdf",
    fileSize: 524288,
  },
];

const gradingAssignments: GradingAssignmentSeed[] = [
  {
    submissionTitle: "Essay on Human-AI Collaboration",
    graderMembershipKey: "GRAD-101:gary@gradience.edu",
    status: "in_progress",
  },
];

const grades: GradeSeed[] = [
  {
    submissionTitle: "Essay on Human-AI Collaboration",
    gradedByMembershipKey: "GRAD-101:gary@gradience.edu",
    totalScore: 88,
    overallFeedback: "Strong arguments with minor citation issues.",
    isReleasedToStudent: true,
    releasedAt: "2026-02-20T10:00:00-05:00",
    gradedAt: "2026-02-19T16:30:00-05:00",
  },
];

const rubricScores: RubricScoreSeed[] = [
  {
    gradeKey: "Essay on Human-AI Collaboration",
    rubricTitle: "Thesis Clarity",
    pointsAwarded: 28,
    comment: "Clear thesis but introduction could be tighter.",
  },
  {
    gradeKey: "Essay on Human-AI Collaboration",
    rubricTitle: "Evidence Quality",
    pointsAwarded: 35,
    comment: "Great sourcing, consider more diverse viewpoints.",
  },
  {
    gradeKey: "Essay on Human-AI Collaboration",
    rubricTitle: "Writing Mechanics",
    pointsAwarded: 25,
    comment: "Minor grammatical errors.",
  },
];

const feedbackComments: FeedbackCommentSeed[] = [
  {
    submissionTitle: "Essay on Human-AI Collaboration",
    authorMembershipKey: "GRAD-101:gary@gradience.edu",
    rubricTitle: "Thesis Clarity",
    commentType: "inline",
    content: "Highlight thesis earlier for stronger hook.",
    pageNumber: 1,
    anchorData: { start: 120, end: 145 },
    isVisibleToStudent: true,
  },
  {
    submissionTitle: "Essay on Human-AI Collaboration",
    authorMembershipKey: "GRAD-101:gary@gradience.edu",
    commentType: "summary",
    content: "Overall, very compelling essay. Address noted grammar items.",
    isVisibleToStudent: true,
  },
];

function mustGet<T>(map: Map<string, T>, key: string, label: string) {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Missing ${label} for key ${key}`);
  }
  return value;
}

async function seed() {
  await withConnection(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query("SET search_path TO gradience, public");
      await client.query(
        "TRUNCATE TABLE feedback_comments, rubric_scores, grades, grading_assignments, submission_files, submissions, assignment_rubric_items, assignments, course_memberships, courses, users RESTART IDENTITY CASCADE",
      );

      const userIds = new Map<string, number>();
      for (const user of users) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO users (first_name, last_name, email, password_hash, auth_provider_id, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            user.firstName,
            user.lastName,
            user.email,
            user.passwordHash,
            user.authProviderId,
            user.status,
          ],
        );
        userIds.set(user.email, rows[0].id);
      }

      const courseIds = new Map<string, number>();
      for (const course of courses) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO courses (title, course_code, term, description, created_by_user_id, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            course.title,
            course.courseCode,
            course.term,
            course.description,
            mustGet(userIds, course.createdByEmail, "user"),
            course.startDate,
            course.endDate,
          ],
        );
        courseIds.set(course.courseCode, rows[0].id);
      }

      const membershipIds = new Map<string, number>();
      for (const membership of memberships) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO course_memberships (course_id, user_id, role)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [
            mustGet(courseIds, membership.courseCode, "course"),
            mustGet(userIds, membership.userEmail, "user"),
            membership.role,
          ],
        );
        membershipIds.set(
          `${membership.courseCode}:${membership.userEmail}`,
          rows[0].id,
        );
      }

      const assignmentIds = new Map<string, number>();
      for (const assignment of assignments) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO assignments (
             course_id, title, description, assignment_type, total_points,
             release_at, due_at, late_until, submission_type, allow_resubmissions,
             max_attempt_resubmission, is_published, created_by_user_id
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           RETURNING id`,
          [
            mustGet(courseIds, assignment.courseCode, "course"),
            assignment.title,
            assignment.description,
            assignment.assignmentType,
            assignment.totalPoints,
            assignment.releaseAt,
            assignment.dueAt,
            assignment.lateUntil,
            assignment.submissionType,
            assignment.allowResubmissions,
            assignment.maxAttemptResubmission,
            assignment.isPublished,
            mustGet(userIds, assignment.createdByEmail, "user"),
          ],
        );
        assignmentIds.set(assignment.title, rows[0].id);
      }

      const rubricItemIds = new Map<string, number>();
      for (const item of rubricItems) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO assignment_rubric_items (
             assignment_id, title, description, max_points, display_order, grading_guidance
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            mustGet(assignmentIds, item.assignmentTitle, "assignment"),
            item.title,
            item.description,
            item.maxPoints,
            item.displayOrder,
            item.gradingGuidance,
          ],
        );
        rubricItemIds.set(item.title, rows[0].id);
      }

      const submissionIds = new Map<string, number>();
      for (const submission of submissions) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO submissions (
             assignment_id, student_membership_id, attempt_number, submitted_at,
             status, text_content, file_url, ai_processed_status
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id`,
          [
            mustGet(assignmentIds, submission.assignmentTitle, "assignment"),
            mustGet(membershipIds, submission.studentMembershipKey, "membership"),
            submission.attemptNumber,
            submission.submittedAt,
            submission.status,
            submission.textContent,
            submission.fileUrl,
            submission.aiProcessedStatus,
          ],
        );
        submissionIds.set(submission.assignmentTitle, rows[0].id);
      }

      for (const file of submissionFiles) {
        await client.query(
          `INSERT INTO submission_files (submission_id, file_url, mime_type, file_size)
           VALUES ($1, $2, $3, $4)`,
          [
            mustGet(submissionIds, file.submissionTitle, "submission"),
            file.fileUrl,
            file.mimeType,
            file.fileSize,
          ],
        );
      }

      for (const ga of gradingAssignments) {
        await client.query(
          `INSERT INTO grading_assignments (submission_id, grader_membership_id, status)
           VALUES ($1, $2, $3)`,
          [
            mustGet(submissionIds, ga.submissionTitle, "submission"),
            mustGet(membershipIds, ga.graderMembershipKey, "membership"),
            ga.status,
          ],
        );
      }

      const gradeIds = new Map<string, number>();
      for (const grade of grades) {
        const { rows } = await client.query<{ id: number }>(
          `INSERT INTO grades (
             submission_id, graded_by_membership_id, total_score, overall_feedback,
             is_released_to_student, released_at, graded_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            mustGet(submissionIds, grade.submissionTitle, "submission"),
            mustGet(membershipIds, grade.gradedByMembershipKey, "membership"),
            grade.totalScore,
            grade.overallFeedback,
            grade.isReleasedToStudent,
            grade.releasedAt,
            grade.gradedAt,
          ],
        );
        gradeIds.set(grade.submissionTitle, rows[0].id);
      }

      for (const score of rubricScores) {
        await client.query(
          `INSERT INTO rubric_scores (grade_id, rubric_item_id, points_awarded, comment)
           VALUES ($1, $2, $3, $4)`,
          [
            mustGet(gradeIds, score.gradeKey, "grade"),
            mustGet(rubricItemIds, score.rubricTitle, "rubric item"),
            score.pointsAwarded,
            score.comment,
          ],
        );
      }

      for (const comment of feedbackComments) {
        await client.query(
          `INSERT INTO feedback_comments (
             submission_id, author_membership_id, rubric_item_id, comment_type,
             content, page_number, anchor_data, is_visible_to_student
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            mustGet(submissionIds, comment.submissionTitle, "submission"),
            mustGet(membershipIds, comment.authorMembershipKey, "membership"),
            comment.rubricTitle
              ? mustGet(rubricItemIds, comment.rubricTitle, "rubric item")
              : null,
            comment.commentType,
            comment.content,
            comment.pageNumber ?? null,
            comment.anchorData ? JSON.stringify(comment.anchorData) : null,
            comment.isVisibleToStudent,
          ],
        );
      }

      await client.query("COMMIT");
      console.info("Database seeded successfully.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

seed().catch((error) => {
  console.error("Database seeding failed:", error);
  process.exitCode = 1;
});
