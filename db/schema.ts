
import { bigint, bigserial, boolean, date, integer, jsonb, pgSchema, text, timestamp, unique } from "drizzle-orm/pg-core"

const gradience = pgSchema("gradience")

// --- Minimal test tables for feature isolation ---
export const grades = gradience.table("grades", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  submissionId: bigint("submission_id", { mode: "number" }).notNull(),
  gradedByMembershipId: bigint("graded_by_membership_id", { mode: "number" }).notNull(),
  totalScore: integer("total_score").notNull(),
  overallFeedback: text("overall_feedback"),
  isReleasedToStudent: boolean("is_released_to_student").notNull().default(false),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  gradedAt: timestamp("graded_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const rubricScores = gradience.table("rubric_scores", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  gradeId: bigint("grade_id", { mode: "number" }).notNull(),
  rubricItemId: bigint("rubric_item_id", { mode: "number" }).notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const feedbackComments = gradience.table("feedback_comments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  submissionId: bigint("submission_id", { mode: "number" }).notNull(),
  authorMembershipId: bigint("author_membership_id", { mode: "number" }).notNull(),
  rubricItemId: bigint("rubric_item_id", { mode: "number" }),
  commentType: text("comment_type").notNull().default('summary'),
  content: text("content").notNull(),
  pageNumber: integer("page_number"),
  anchorData: text("anchor_data"), // Use text for JSONB for now
  isVisibleToStudent: boolean("is_visible_to_student").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
});

export const users = gradience.table("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  authProviderId: text("auth_provider_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  status: text("status").notNull(),
})

export const courses = gradience.table("courses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  courseCode: text("course_code").notNull(),
  term: text("term").notNull(),
  description: text("description"),
  createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
})

export const courseMemberships = gradience.table(
  "course_memberships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    courseId: bigint("course_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (table) => ({
    courseUserUnique: unique().on(table.courseId, table.userId),
  }),
)

export const assignments = gradience.table("assignments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  courseId: bigint("course_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  rubricJson: jsonb("rubric_json"),
  questionsJson: jsonb("questions_json"),
  assignmentType: text("assignment_type").notNull(),
  totalPoints: integer("total_points").notNull(),
  releaseAt: timestamp("release_at", { withTimezone: true, mode: "string" }).notNull(),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }).notNull(),
  lateUntil: timestamp("late_until", { withTimezone: true, mode: "string" }),
  submissionType: text("submission_type").notNull(),
  allowResubmissions: boolean("allow_resubmissions").notNull().default(false),
  maxAttemptResubmission: integer("max_attempt_resubmission").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(false),
  createdByUserId: bigint("created_by_user_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
})

export const assignmentRubricItems = gradience.table("assignment_rubric_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  assignmentId: bigint("assignment_id", { mode: "number" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  maxPoints: integer("max_points").notNull(),
  displayOrder: integer("display_order").notNull(),
  gradingGuidance: text("grading_guidance"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
})

export const submissions = gradience.table("submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  assignmentId: bigint("assignment_id", { mode: "number" }).notNull(),
  studentMembershipId: bigint("student_membership_id", { mode: "number" }).notNull(),
  attemptNumber: integer("attempt_number").notNull().default(1),
  submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  status: text("status").notNull(),
  textContent: text("text_content"),
  fileUrl: text("file_url"),
  aiProcessedStatus: text("ai_processed_status").notNull().default("awaiting"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
})
