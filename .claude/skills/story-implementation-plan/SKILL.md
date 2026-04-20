---
name: story-implementation-plan
description: Produce an implementation-oriented plan for an existing story JSON
---

When invoked, do the following:

1. Read a story specification from a JSON file provided by the user, or default to:
   automation/out/story.json

2. Using the story specification, produce a scoped implementation plan.

Requirements:
- Do not expand scope beyond the story.
- Preserve existing architecture unless change is necessary.
- Prefer incremental backend, frontend, and test work.
- State assumptions clearly.
- Mention migrations, APIs, UI changes, and validation only if needed.

Output sections:
1. implementation plan
2. backend changes
3. frontend changes
4. test changes
5. known risks/assumptions