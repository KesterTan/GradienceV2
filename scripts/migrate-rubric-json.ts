import "dotenv/config";
import { withConnection } from "../db/db";

type OldRubricItem = {
  criterion: string;
  score_awarded?: number;
  max_score: number;
  explanation?: string;
};

type OldRubricQuestion = {
  question_id: string;
  rubric_items: OldRubricItem[];
};

type OldRubricPayload = {
  questions: OldRubricQuestion[];
  overall_feedback?: string;
  total_score?: number;
  total_max_score?: number;
};

type NewRubricItem = {
  criterion: string;
  rubric_name: string;
  max_score: number;
};

type NewRubricQuestion = {
  question_id: string;
  question_name: string;
  rubric_items: NewRubricItem[];
};

type NewRubricPayload = {
  questions: NewRubricQuestion[];
};

function parsePayload(raw: unknown): OldRubricPayload | NewRubricPayload | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as OldRubricPayload | NewRubricPayload;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as OldRubricPayload | NewRubricPayload;
  }
  return null;
}

function isAlreadyNew(payload: OldRubricPayload | NewRubricPayload): payload is NewRubricPayload {
  const firstQuestion = payload.questions?.[0] as NewRubricQuestion | undefined;
  if (!firstQuestion) return false;
  if (typeof firstQuestion.question_name === "string") return true;
  const firstItem = firstQuestion.rubric_items?.[0] as NewRubricItem | undefined;
  return Boolean(firstItem && typeof firstItem.rubric_name === "string");
}

function migratePayload(payload: OldRubricPayload): NewRubricPayload {
  return {
    questions: payload.questions.map((question) => ({
      question_id: question.question_id,
      question_name: "",
      rubric_items: question.rubric_items.map((item) => ({
        criterion: item.criterion,
        rubric_name: "",
        max_score: item.max_score,
      })),
    })),
  };
}

async function main() {
  await withConnection(async (client) => {
    await client.query("SET search_path TO gradience, public");

    const { rows } = await client.query<{ id: number; rubric_json: unknown }>(
      "SELECT id, rubric_json FROM assignments WHERE rubric_json IS NOT NULL",
    );

    let updated = 0;
    let skipped = 0;
    let invalid = 0;

    for (const row of rows) {
      const parsed = parsePayload(row.rubric_json);
      if (!parsed || !Array.isArray((parsed as OldRubricPayload).questions)) {
        invalid += 1;
        continue;
      }

      if (isAlreadyNew(parsed)) {
        skipped += 1;
        continue;
      }

      const migrated = migratePayload(parsed as OldRubricPayload);
      await client.query("UPDATE assignments SET rubric_json = $1 WHERE id = $2", [
        JSON.stringify(migrated),
        row.id,
      ]);
      updated += 1;
    }

    console.info(
      `Rubric migration complete: updated ${updated}, skipped ${skipped}, invalid ${invalid}.`,
    );
  });
}

main().catch((error) => {
  console.error("Rubric migration failed:", error);
  process.exitCode = 1;
});
