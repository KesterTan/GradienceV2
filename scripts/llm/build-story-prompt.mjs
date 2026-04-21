import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const [, , modeArg = "implementation", storyPathArg = "automation/out/story.json"] = process.argv;

const mode = modeArg === "tests" ? "tests" : "implementation";
const root = process.cwd();
const storyPath = path.resolve(root, storyPathArg);
const story = JSON.parse(fs.readFileSync(storyPath, "utf8"));

const promptPath =
  mode === "tests"
    ? path.join(root, "prompts/regrade-tests.prompt.md")
    : path.join(root, "prompts/regrade-implementation.prompt.md");

const template = fs.readFileSync(promptPath, "utf8");

const output = [
  template.trim(),
  "",
  "Story title:",
  story.title,
  "",
  "User story:",
  story.user_story,
  "",
  "Machine acceptance criteria:",
  ...(story.machine_acceptance_criteria ?? []).map((item) => `- ${item}`),
  "",
  "Human acceptance criteria:",
  ...(story.human_acceptance_criteria ?? []).map((item) => `- ${item}`),
  "",
  "Implementation plan:",
  ...(story.implementation_plan ?? []).map((item) => `- ${item}`),
  "",
  "Backend changes:",
  ...(story.backend_changes ?? []).map((item) => `- ${item}`),
  "",
  "Frontend changes:",
  ...(story.frontend_changes ?? []).map((item) => `- ${item}`),
  "",
  "Test changes:",
  ...(story.test_changes ?? []).map((item) => `- ${item}`),
  "",
  "Known risks / assumptions:",
  ...(story.known_risks_assumptions ?? []).map((item) => `- ${item}`),
].join("\n");

process.stdout.write(`${output}\n`);
