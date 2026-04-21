// --- Imports for server action logic ---
import { db } from "@/db/orm";
import { assignments, courseMemberships } from "@/db/schema";
import { requireAppUser } from "@/lib/current-user";
import { loadJsonFromS3ObjectKey } from "@/lib/s3-submissions";
// import { rubricPayloadSchema } from "@/lib/rubrics"; // (already imported above)
import { and, eq } from "drizzle-orm";

function buildAssignmentQuestionObjectKeyCandidates(courseId: number, assignmentId: number) {
  return [
    `questions/assessments/${courseId}/${assignmentId}/questions.json`,
    `assignments/${courseId}/${assignmentId}/questions.json`,
    `assessments/${courseId}/${assignmentId}/questions.json`,
    `questions/assignments/${courseId}/${assignmentId}.json`,
    `questions/assignments/${assignmentId}.json`,
  ];
}

async function loadAssignmentQuestionsJsonFromS3(courseId: number, assignmentId: number) {
  const candidates = buildAssignmentQuestionObjectKeyCandidates(courseId, assignmentId);
  for (const objectKey of candidates) {
    const payload = await loadJsonFromS3ObjectKey(objectKey);
    if (payload) {
      return payload;
    }
  }
  return null;
}

async function requireInstructorMembership(courseId: number, userId: number) {
  const membership = await db
    .select({ id: courseMemberships.id })
    .from(courseMemberships)
    .where(
      and(
        eq(courseMemberships.courseId, courseId),
        eq(courseMemberships.userId, userId),
        eq(courseMemberships.role, "grader"),
        eq(courseMemberships.status, "active")
      )
    )
    .limit(1);
  return membership[0] ?? null;
}

export async function generateRubricSuggestionAction(
  _prevState: any,
  formData: FormData,
): Promise<any> {
  const user = await requireAppUser();
  const rawCourseId = formData.get("courseId");
  const rawAssignmentId = formData.get("assignmentId");
  const courseId = typeof rawCourseId === "string" ? Number(rawCourseId) : NaN;
  const assignmentId = typeof rawAssignmentId === "string" ? Number(rawAssignmentId) : NaN;
  if (!Number.isFinite(courseId) || !Number.isFinite(assignmentId)) {
    return { errors: { _form: ["Invalid course or assignment id."] } };
  }
  const membership = await requireInstructorMembership(courseId, user.id);
  if (!membership) {
    return { errors: { _form: ["You do not have permission to generate rubrics for this assessment."] } };
  }
  const assignmentRows = await db
    .select({ id: assignments.id })
    .from(assignments)
    .where(and(eq(assignments.id, assignmentId), eq(assignments.courseId, courseId)))
    .limit(1);
  if (!assignmentRows[0]) {
    return { errors: { _form: ["Assessment not found."] } };
  }
  let questionPayload: unknown = null;
  try {
    questionPayload = await loadAssignmentQuestionsJsonFromS3(courseId, assignmentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      errors: {
        _form: [
          `Unable to read assignment questions from storage. ${message}`,
        ],
      },
    };
  }
  const rubricSuggestUrlResult = parseAiEndpoint(
    "AI_RUBRIC_SUGGEST_API_URL",
    process.env.AI_RUBRIC_SUGGEST_API_URL,
  );
  if ("error" in rubricSuggestUrlResult) {
    return { errors: { _form: [rubricSuggestUrlResult.error] } };
  }
  const rubricSuggestUrl = rubricSuggestUrlResult.value;
  const payload = new FormData();
  payload.append(
    "question_file",
    new Blob([JSON.stringify(questionPayload)], { type: "application/json" }),
    `assignment-${assignmentId}-questions.json`,
  );
  const controller = new AbortController();
  const timeoutMs = Number(process.env.AI_RUBRIC_SUGGEST_TIMEOUT_MS) || 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(rubricSuggestUrl, {
      method: "POST",
      body: payload,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { errors: { _form: ["Rubric suggestion request timed out. Please try again."] } };
    }
    return { errors: { _form: ["Unable to reach the rubric suggestion service right now."] } };
  } finally {
    clearTimeout(timeoutId);
  }
  const responseText = await response.text();
  if (!response.ok) {
    const suffix = responseText.trim().length > 0 ? ` ${responseText.trim().slice(0, 300)}` : "";
    return { errors: { _form: [`Rubric suggestion request failed (${response.status}).${suffix}`] } };
  }
  let responseJson: unknown;
  try {
    responseJson = JSON.parse(responseText);
  } catch {
    return { errors: { _form: ["Rubric suggestion service did not return valid JSON."] } };
  }
  const normalized = normalizeSuggestedRubricPayload(responseJson);
  if (!normalized) {
    return { errors: { _form: ["Rubric suggestion response format was not recognized."] } };
  }
  const parsed = rubricPayloadSchema.safeParse({
    questions: normalized.questions,
    overall_feedback: normalized.overall_feedback,
  });
  if (!parsed.success) {
    return { errors: { _form: ["Suggested rubric payload did not pass validation."] } };
  }
  return { rubric: normalized };
}
// Shared rubric suggestion logic for both app and tests
import { rubricPayloadSchema } from "@/lib/rubrics";

export function parseAiEndpoint(envName: string, rawUrl: string | undefined) {
  if (!rawUrl || rawUrl.trim().length === 0) {
    return { error: `Missing ${envName}. Configure AI_RUBRIC_SUGGEST_API_URL.` };
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { error: `${envName} must be a valid URL. Configure AI_RUBRIC_SUGGEST_API_URL.` };
  }
  const allowInsecure =
    process.env.NODE_ENV === "development" ||
    (process.env.ALLOW_INSECURE_AI || "").toLowerCase() === "true";
  if (parsedUrl.protocol !== "https:" && !allowInsecure) {
    return {
      error: `${envName} must use https:// in production. Configure AI_RUBRIC_SUGGEST_API_URL with a secure endpoint, or set ALLOW_INSECURE_AI=true only for local development.`,
    };
  }
  return { value: parsedUrl.toString() };
}

export function normalizeSuggestedRubricPayload(rawPayload: unknown) {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  const value = rawPayload as Record<string, any>;
  if (!Array.isArray(value.questions)) {
    return null;
  }
  const normalizedQuestions = value.questions.map((question: any, index: number) => {
    if (!question || typeof question !== "object") return null;
    const rubricItems = Array.isArray(question.rubric_items)
      ? question.rubric_items.map((item: any) => {
          if (!item || typeof item !== "object") return null;
          return {
            criterion: typeof item.criterion === "string" ? item.criterion : "",
            explanation: typeof item.explanation === "string" ? item.explanation : "",
            max_score: typeof item.max_score === "number" ? item.max_score : 0,
          };
        }).filter(Boolean)
      : [];
    if (rubricItems.length === 0) return null;
    const questionId = typeof question.question_id === "string" && question.question_id.trim().length > 0
      ? question.question_id.trim()
      : `Q${index + 1}`;
    return {
      question_id: questionId,
      question_max_total: rubricItems.reduce((sum: number, item: { max_score: number }) => sum + item.max_score, 0),
      rubric_items: rubricItems,
    };
  }).filter(Boolean);
  if (normalizedQuestions.length === 0) return null;
  return {
    questions: normalizedQuestions,
    overall_feedback: typeof value.overall_feedback === "string" ? value.overall_feedback : "",
  };
}
