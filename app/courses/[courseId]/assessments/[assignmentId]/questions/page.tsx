import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QuestionEditor } from "./_components/question-editor"
import { getAssessmentQuestionsForMember } from "@/lib/course-management"
import { requireAppUser } from "@/lib/current-user"
import { parseQuestionsJson } from "@/lib/questions"

export default async function AssessmentQuestionsPage({
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

  const assessment = await getAssessmentQuestionsForMember(user.id, parsedCourseId, parsedAssignmentId)
  if (!assessment) {
    notFound()
  }

  const isInstructor = assessment.viewerRole === "Instructor"
  const questions = parseQuestionsJson(assessment.questionsJson)

  return (
    <main className="min-h-screen bg-muted/30">
      <DashboardHeader
        title="Questions"
        subtitle={assessment.title}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: assessment.courseTitle, href: `/courses/${assessment.courseId}` },
          { label: assessment.title, href: `/courses/${assessment.courseId}/assessments/${assessment.id}` },
          { label: "Questions", current: true },
        ]}
        user={{ name: `${user.firstName} ${user.lastName}`, email: user.email }}
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Questions</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isInstructor
                ? "Add questions to this assessment one at a time."
                : "View questions for this assessment."}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/courses/${assessment.courseId}/assessments/${assessment.id}`}>
              Back to assessment
            </Link>
          </Button>
        </div>

        {questions === null && !isInstructor ? (
          <Card>
            <CardHeader>
              <CardTitle>No questions yet</CardTitle>
              <CardDescription>The instructor has not added questions for this assessment.</CardDescription>
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
          <QuestionEditor
            courseId={assessment.courseId}
            assignmentId={assessment.id}
            initialPayload={questions}
            canEdit={isInstructor}
            assignmentTitle={assessment.title}
            courseTitle={assessment.courseTitle}
          />
        )}
      </section>
    </main>
  )
}
