import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";

const {
  OPENAI_API_KEY,
  OPENAI_MODEL = "gpt-4.1-mini",
  SPEC_PATH,
  MODE,
  STORY_TITLE,
  STORY_ID,
  PR_NUMBER,
  BASE_SHA,
  HEAD_SHA,
} = process.env;

if (!SPEC_PATH || !MODE || !STORY_TITLE || !STORY_ID) {
  throw new Error("Missing required environment variables for spec generation.");
}

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required.");
}

const root = process.cwd();
const specAbsolutePath = path.join(root, SPEC_PATH);
const createPromptPath = path.join(root, "prompts/dev-spec-create.prompt.md");
const updatePromptPath = path.join(root, "prompts/dev-spec-update.prompt.md");

const changedFiles = execSync(`git diff --name-only ${BASE_SHA} ${HEAD_SHA}`, {
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .slice(0, 200);

const diff = execSync(`git diff --unified=1 ${BASE_SHA} ${HEAD_SHA}`, {
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
});

const createPrompt = fs.readFileSync(createPromptPath, "utf8");
const updatePrompt = fs.readFileSync(updatePromptPath, "utf8");
const existingSpec = fs.existsSync(specAbsolutePath)
  ? fs.readFileSync(specAbsolutePath, "utf8")
  : "";

const userPrompt = [
  MODE === "create" ? createPrompt : updatePrompt,
  "",
  `Story id: ${STORY_ID}`,
  `Story title: ${STORY_TITLE}`,
  `Linked PR number: ${PR_NUMBER}`,
  "",
  "Changed files:",
  changedFiles.length ? changedFiles.map((f) => `- ${f}`).join("\n") : "- none",
  "",
  MODE === "update" ? "Existing specification content:" : "No existing specification content.",
  MODE === "update" ? existingSpec : "",
  "",
  "Code diff:",
  diff,
].join("\n");

const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You write precise engineering development specifications in markdown for pull-request review.",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.1,
  }),
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`OpenAI request failed (${response.status}): ${text}`);
}

const json = await response.json();
const content = json?.choices?.[0]?.message?.content;
if (!content) {
  throw new Error("Missing content in OpenAI response.");
}

fs.writeFileSync(specAbsolutePath, `${content.trim()}\n`, "utf8");
console.log(`Wrote ${SPEC_PATH} (${MODE}).`);
