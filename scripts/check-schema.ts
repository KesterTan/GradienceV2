import type { ClientBase } from "pg";

import { withConnection } from "../db/db";

const requiredTables = [
  "users",
  "courses",
  "course_memberships",
  "assignments",
  "assignment_rubric_items",
  "submissions",
  "submission_files",
  "grading_assignments",
  "grades",
  "rubric_scores",
  "feedback_comments",
];

const expectedSeedCounts: Record<string, number> = {
  users: 3,
  courses: 1,
  course_memberships: 3,
  assignments: 1,
  assignment_rubric_items: 3,
  submissions: 1,
  submission_files: 1,
  grading_assignments: 1,
  grades: 1,
  rubric_scores: 3,
  feedback_comments: 2,
};

const seedUsers = [
  { email: "irene@gradience.edu", role: "grader" },
  { email: "gary@gradience.edu", role: "grader" },
  { email: "stu@gradience.edu", role: "student" },
];

async function ensureTables(client: ClientBase) {
  for (const table of requiredTables) {
    const { rows } = await client.query<{ oid: string | null }>(
      "SELECT to_regclass($1) AS oid",
      [`gradience.${table}`],
    );
    if (!rows[0]?.oid) {
      throw new Error(`Missing table gradience.${table}`);
    }
  }
}

async function ensureCounts(client: ClientBase) {
  for (const [table, expected] of Object.entries(expectedSeedCounts)) {
    const { rows } = await client.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM ${table}`,
    );
    if (rows[0]?.count !== expected) {
      throw new Error(
        `Table ${table} count mismatch: expected ${expected}, got ${rows[0]?.count}`,
      );
    }
  }
}

async function ensureSeedUsers(client: ClientBase) {
  for (const user of seedUsers) {
    const { rows } = await client.query<{ email: string; global_role: string }>(
      "SELECT email, global_role FROM users WHERE email = $1",
      [user.email],
    );
    if (!rows[0]) {
      throw new Error(`Missing seed user ${user.email}`);
    }
    if (rows[0].global_role !== user.role) {
      throw new Error(
        `Seed user ${user.email} role mismatch: expected ${user.role}, got ${rows[0].global_role}`,
      );
    }
  }
}

async function main() {
  await withConnection(async (client) => {
    await client.query("SET search_path TO gradience, public");
    await ensureTables(client);
    await ensureCounts(client);
    await ensureSeedUsers(client);
  });

  console.info("Database schema and seed data verified successfully.");
}

main().catch((error) => {
  console.error("Database verification failed:", error);
  process.exitCode = 1;
});
