Generate a new development specification in markdown for a single user story.

Required output goals:
- Explain architecture and data flow clearly enough for another engineer to implement or review.
- Document backend, frontend, test, and risk considerations.
- Include a section named `## Human Review Checklist` that lists what humans must verify manually.
- Keep claims grounded in the provided code diff and changed files.
- If any detail is uncertain, explicitly say `Assumption:` and describe it.

Required sections:
1. `# Development Specification — <story title>`
2. `## Scope / user story`
3. `## Architecture`
4. `## Information flow`
5. `## Backend changes`
6. `## Frontend changes`
7. `## Test changes`
8. `## Risks / assumptions`
9. `## Human Review Checklist`

Do not include placeholders like TODO.
