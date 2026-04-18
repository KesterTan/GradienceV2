---
name: story-publisher
description: Generate one implementation-sized user story, write it as JSON, and publish it to the GitHub issue tracker and project board
---

When invoked, do the following:

1. Read the current repository context, including:
   - CLAUDE.md
   - README or product docs if present
   - relevant source files if needed
2. Generate exactly one implementation-sized user story suitable for one PR and about two weeks or less.
3. Return the story in valid JSON with exactly this shape:

{
  "title": "short issue title",
  "user_story": "As a ...",
  "rationale": "why this is the right next increment",
  "machine_acceptance_criteria": [
    "Given ... when ... then ..."
  ],
  "human_acceptance_criteria": [
    "..."
  ],
  "implementation_plan": [
    "..."
  ],
  "backend_changes": [
    "..."
  ],
  "frontend_changes": [
    "..."
  ],
  "test_changes": [
    "..."
  ],
  "known_risks_assumptions": [
    "..."
  ],
  "priority": "P1",
  "size": "M",
  "sprint": "sprint3"
}

Requirements:
- The user_story must exactly follow:
  "As a <user>, I want <action>, so that <benefit>."
- The story must be tightly scoped.
- Choose one priority from P0, P1, P2.
- Choose one size from XS, S, M, L.
- Always set sprint to sprint3.
- Prefer direct continuation of the current product rather than speculative ideas.

4. Write the JSON to:
   automation/out/story.json

5. Unless the user explicitly asked for immediate publishing, show the JSON and ask for confirmation.

6. If approved, run:
   bash automation/scripts/publish_story.sh GradientV1/YOUR_REPO automation/out/story.json

7. Report:
   - the issue URL
   - the labels applied
   - whether the project item fields were set successfully