Update the existing development specification in markdown based on the latest pull request changes.

Rules:
- Preserve useful existing content, but revise outdated sections.
- Add or edit only what is needed to reflect the code changes in this PR.
- Include a short `## Revision Notes` section summarizing what changed in the specification.
- Keep all statements tied to the provided changed files and diff.
- If a previous section is now incorrect, replace it instead of leaving contradictory text.
- If any detail is uncertain, explicitly label it with `Assumption:`.

Required minimum sections in final output:
- `# Development Specification — ...`
- `## Scope / user story`
- `## Backend changes`
- `## Frontend changes`
- `## Test changes`
- `## Risks / assumptions`
- `## Revision Notes`
- `## Human Review Checklist`
