import { readFile } from "node:fs/promises"
import path from "node:path"
import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { db } from "@/db/orm"
import { assignments, courseMemberships, submissions } from "@/db/schema"
import { requireAppUser } from "@/lib/current-user"
import { loadSubmissionPdfFromS3 } from "@/lib/s3-submissions"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ courseId: string; assignmentId: string; submissionId: string }>
  },
) {
  try {
    const user = await requireAppUser()
    const { courseId, assignmentId, submissionId } = await params

    const parsedCourseId = Number(courseId)
    const parsedAssignmentId = Number(assignmentId)
    const parsedSubmissionId = Number(submissionId)

    if (
      !Number.isFinite(parsedCourseId) ||
      !Number.isFinite(parsedAssignmentId) ||
      !Number.isFinite(parsedSubmissionId)
    ) {
      return NextResponse.json({ error: "Invalid route parameters." }, { status: 400 })
    }

    const membershipRows = await db
      .select({ id: courseMemberships.id, role: courseMemberships.role })
      .from(courseMemberships)
      .where(
        and(
          eq(courseMemberships.courseId, parsedCourseId),
          eq(courseMemberships.userId, user.id),
          eq(courseMemberships.status, "active"),
        ),
      )
      .limit(1)

    const membership = membershipRows[0]
    if (!membership) {
      return NextResponse.json({ error: "You are not an active member of this course." }, { status: 403 })
    }

    const submissionRows = await db
      .select({
        id: submissions.id,
        studentMembershipId: submissions.studentMembershipId,
        fileUrl: submissions.fileUrl,
      })
      .from(submissions)
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .where(
        and(
          eq(submissions.id, parsedSubmissionId),
          eq(assignments.id, parsedAssignmentId),
          eq(assignments.courseId, parsedCourseId),
        ),
      )
      .limit(1)

    const submission = submissionRows[0]
    if (!submission || !submission.fileUrl) {
      return NextResponse.json({ error: "Submitted file not found." }, { status: 404 })
    }

    const isStudentOwner = membership.role === "student" && Number(submission.studentMembershipId) === Number(membership.id)
    const isGrader = membership.role === "grader"

    if (!isStudentOwner && !isGrader) {
      return NextResponse.json({ error: "You do not have access to this file." }, { status: 403 })
    }

    const fileUrl = String(submission.fileUrl)

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return NextResponse.redirect(fileUrl)
    }

    if (fileUrl.startsWith("s3://")) {
      const buffer = await loadSubmissionPdfFromS3(fileUrl)
      if (!buffer) {
        return NextResponse.json({ error: "Submitted file not found." }, { status: 404 })
      }

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline",
          "Cache-Control": "private, no-store",
        },
      })
    }

    if (!fileUrl.startsWith("/")) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 404 })
    }

    const relative = fileUrl.replace(/^\/+/, "")
    const normalized = path.normalize(relative)
    const absolute = path.join(process.cwd(), "public", normalized)

    if (!absolute.startsWith(path.join(process.cwd(), "public"))) {
      return NextResponse.json({ error: "Invalid file path." }, { status: 404 })
    }

    const buffer = await readFile(absolute)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json({ error: "Unable to load submitted file." }, { status: 404 })
  }
}
