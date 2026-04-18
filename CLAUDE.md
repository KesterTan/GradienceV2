# Project workflow

This repository uses Claude Code for user-story planning and GitHub project publishing.

For new product user stories:
- Each story must follow exactly: "As a <user>, I want <action>, so that <benefit>."
- Each story must be small enough for one PR and roughly two weeks or less.
- Each story must include:
  - machine acceptance criteria
  - human acceptance criteria (this should be something like)
  - implementation plan
  - backend changes
  - frontend changes
  - test changes
  - known risks/assumptions
- Each published story must be added to the GitHub Project board:
  - org: GradientV1
  - project number: 1
- Each published story must be tagged with:
  - sprint3
  - one priority label: priority:P0, priority:P1, or priority:P2
  - one size label: size:XS, size:S, size:M, or size:L

Engineering preferences:
- Follow existing project patterns.
- Avoid unrelated refactors.
- Prefer testable, incremental changes.
- Keep user-facing language clear.
- Humans remain responsible for product decisions, reviews, merges, secrets, and fixing incorrect model output.

## Pull request workflow

For pull requests created by Claude Code:
- Create a feature branch if needed.
- Keep the PR scoped to a single user story unless the user explicitly requests otherwise.
- Before opening a PR, summarize:
  - what changed
  - backend changes
  - frontend changes
  - test changes
  - risks / follow-ups
- PR titles should be concise and action-oriented.
- PR bodies should include:
  - linked issue
  - summary
  - testing
  - risks / assumptions
- If asked to publish a PR, Claude should:
  1. inspect git status and current branch
  2. create a branch if needed
  3. stage and commit changes
  4. push the branch
  5. open a PR with gh
  6. return the PR URL
- Humans remain responsible for final review, approvals, protected-branch policies, and merge decisions.