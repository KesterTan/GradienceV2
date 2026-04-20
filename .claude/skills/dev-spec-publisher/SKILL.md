---
name: dev-spec-publisher
description: Create a development specification for a user story, commit it, and publish a PR for review.
---


do the following:

When invoked as:

		/publish-dev-spec publish dev spec for PR #<number> [and PR #<number2> ...]



		/publish-dev-spec publish dev spec for PRs #<number1>, #<number2>, ...

do the following:

1. Use GitHub Actions to:
	 - Fetch the details (title, body, diff, linked issues, etc.) for all specified PR numbers.
	 - Summarize the combined scope, changes, risks, and validation steps from all PRs.
	 - Auto-generate a dev spec markdown file (e.g., DEV_SPEC_PR_<number1>_<number2>_...md) with:
		 - PR titles and summaries
		 - Linked issues
		 - Combined scope and user stories (from PRs or linked issues)
		 - Implementation summary (from diffs and PR bodies)
		 - Risks/assumptions
		 - Validation/acceptance criteria
2. Commit the dev spec file to a new branch (e.g., dev-spec/pr-<number1>-<number2>-...).
3. Open a PR for the dev spec file, referencing all original PRs.

This skill is fully automated via GitHub Actions and does not require local scripts. The workflow will:
- Trigger on workflow_dispatch with one or more PR numbers as input
- Use the GitHub API to fetch PR details and diffs
- Generate the dev spec markdown
- Commit and push to a new branch
- Open a PR for the dev spec

See automation/scripts/dev_spec_from_pr.sh for implementation details (should be updated to support multiple PRs).

