import "dotenv/config";
import type { ClientBase } from "pg";

import { withConnection } from "../db/db";

type TestCase = {
  description: string;
  query: string;
};

const relationalTests: TestCase[] = [
  {
    description: "Course memberships must belong to existing courses and users",
    query: `
      SELECT cm.id
      FROM course_memberships cm
      LEFT JOIN courses c ON c.id = cm.course_id
      LEFT JOIN users u ON u.id = cm.user_id
      WHERE c.id IS NULL OR u.id IS NULL
    `,
  },
  {
    description: "Submissions must reference student memberships on the same course",
    query: `
      SELECT s.id
      FROM submissions s
      JOIN course_memberships cm ON cm.id = s.student_membership_id
      JOIN assignments a ON a.id = s.assignment_id
      WHERE cm.role <> 'student' OR cm.course_id <> a.course_id
    `,
  },
  {
    description: "Grading assignments must use grader memberships on the same course",
    query: `
      SELECT ga.id
      FROM grading_assignments ga
      JOIN submissions s ON s.id = ga.submission_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN course_memberships cm ON cm.id = ga.grader_membership_id
      WHERE cm.role <> 'grader' OR cm.course_id <> a.course_id
    `,
  },
  {
    description: "Grades must be issued by grader memberships on the same course",
    query: `
      SELECT g.id
      FROM grades g
      JOIN submissions s ON s.id = g.submission_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN course_memberships cm ON cm.id = g.graded_by_membership_id
      WHERE cm.role <> 'grader' OR cm.course_id <> a.course_id
    `,
  },
  {
    description: "Rubric scores must reference rubric items tied to the graded assignment",
    query: `
      SELECT rs.id
      FROM rubric_scores rs
      JOIN grades g ON g.id = rs.grade_id
      JOIN submissions s ON s.id = g.submission_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN assignment_rubric_items ari ON ari.id = rs.rubric_item_id
      WHERE ari.assignment_id <> a.id
    `,
  },
  {
    description: "Feedback comments must originate from memberships in the submission's course",
    query: `
      SELECT fc.id
      FROM feedback_comments fc
      JOIN submissions s ON s.id = fc.submission_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN course_memberships author ON author.id = fc.author_membership_id
      WHERE author.course_id <> a.course_id
    `,
  },
  {
    description: "Feedback comments linked to rubric items must stay within the same assignment",
    query: `
      SELECT fc.id
      FROM feedback_comments fc
      JOIN submissions s ON s.id = fc.submission_id
      JOIN assignments a ON a.id = s.assignment_id
      JOIN assignment_rubric_items ari ON ari.id = fc.rubric_item_id
      WHERE fc.rubric_item_id IS NOT NULL AND ari.assignment_id <> a.id
    `,
  },
];

async function ensureEmptyResult(client: ClientBase, test: TestCase) {
  const { rowCount } = await client.query(test.query);
  if (rowCount && rowCount > 0) {
    throw new Error(`${test.description} (failures: ${rowCount})`);
  }
}

async function main() {
  await withConnection(async (client) => {
    await client.query("SET search_path TO gradience, public");
    for (const test of relationalTests) {
      await ensureEmptyResult(client, test);
    }
  });
  console.info("All relationship tests passed.");
}

main().catch((error) => {
  console.error("Relationship tests failed:", error);
  process.exitCode = 1;
});
