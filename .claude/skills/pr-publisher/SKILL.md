---
name: pr-publisher
description: Prepare, publish, and summarize a pull request for the current user story
---

When invoked, do the following:

1. Read:
   - CLAUDE.md
   - git status
   - current branch
   - the relevant issue number or issue URL if available
2. Inspect the current diff and summarize the change set.
3. Unless the user explicitly asked for immediate publishing, show:
   - proposed branch name
   - proposed commit message
   - proposed PR title
   - proposed PR body
4. If approved, run the PR publish script:
   bash automation/scripts/publish_pr.sh GradientV1/YOUR_REPO

Requirements:
- Keep the PR scoped to one story.
- Prefer branch names like:
  feature/<short-story-name>
  fix/<short-problem-name>
- PR title should be short and clear.
- PR body must include these sections:

## Summary
- ...

## Linked Issue
- Closes #...

## Changes
### Backend
- ...

### Frontend
- ...

### Tests
- ...

## Risks / Assumptions
- ...

## Validation
- [ ] Tests run
- [ ] Manual verification completed

5. Return:
   - branch name
   - commit SHA if created
   - PR URL