import { bigint, bigserial, boolean, date, integer, pgSchema, text, timestamp, unique } from "drizzle-orm/pg-core"

const gradience = pgSchema("gradience")

export const users = gradience.table("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  authProviderId: text("auth_provider_id"),
  globalRole: text("global_role").notNull(),
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
