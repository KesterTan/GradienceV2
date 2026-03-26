import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RubricEditor } from "./_components/rubric-editor"
import { getAssessmentRubricForMember } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"

type RubricPayload = {
  questions: Array<{
    question_id: string
    question_name: string
    rubric_items: Array<{
      criterion: string
      rubric_name: string
      max_score: number
    }>
  }>
}

function parseRubricJson(raw: unknown): RubricPayload | null {
  if (!raw) return null
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RubricPayload
    } catch {
      return null
    }
  }
  if (typeof raw === "object") {
    return raw as RubricPayload
  }
  return null
}

export default async function AssessmentRubricPage({
  params,
}: {
  params: Promise<{ courseId: string; assignmentId: string }>
}) {
  const user = await requireAppUser()
  const { courseId, assignmentId } = await params

  const parsedCourseId = Number(courseId)
  const parsedAssignmentId = Number(assignmentId)

  if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
    notFound()
  }

  const assessment = await getAssessmentRubricForMember(user.id, parsedCourseId, parsedAssignmentId)
  if (!assessment) {
    notFound()
  }

  const isInstructor = assessment.viewerRole === "Instructor"
  const rubric = parseRubricJson(assessment.rubricJson)

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Rubric"
        subtitle={assessment.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: assessment.courseTitle, href: `/courses/${assessment.courseId}` },
          { label: assessment.title, href: `/courses/${assessment.courseId}/assessments/${assessment.id}` },
          { label: "Rubric", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Rubric</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isInstructor
                ? "Add rubric items and assign points for this assessment."
                : "View rubric details for this assessment."}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}`}>
              Back to assessment
            </Link>
          </Button>
        </div>

        {rubric === null && !isInstructor ? (
          <Card>
            <CardHeader>
              <CardTitle>No rubric yet</CardTitle>
              <CardDescription>The instructor has not added a rubric for this assessment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}`}>
                  Back to assessment
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <RubricEditor
            courseId={assessment.courseId}
            assignmentId={assessment.id}
            initialRubric={rubric}
            canEdit={isInstructor}
          />
        )}
      </section>
    </main>
  )
}
