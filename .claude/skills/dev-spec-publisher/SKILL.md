---
name: dev-spec-publisher
description: Generate a development specification (dev spec) for one or more PRs by analyzing their diffs, titles, and bodies using GitHub Actions automation.
---

When invoked as:

    /publish-dev-spec publish dev spec for PR #<number> [and PR #<number2> ...]

or

    /publish-dev-spec publish dev spec for PRs #<number1>, #<number2>, ...

do the following:

1. Before creating the dev spec, create a tracking issue in `Gradient/GradientV1` (or a configured issue repo) describing the PR(s) that will be covered.
2. Use GitHub Actions to:
   - Fetch the details (title, body, diff, linked issues, etc.) for all specified PR numbers.
   - Summarize the combined scope, changes, risks, and validation steps from all PRs.
   - Auto-generate a dev spec markdown file (e.g., DEV_SPEC_PR_<number1>_<number2>_...md) with:
    - Tracking issue URL
     - PR titles and summaries
     - Linked issues
     - Combined scope and user stories (from PRs or linked issues)
     - Implementation summary (from diffs and PR bodies)
     - Risks/assumptions
     - Validation/acceptance criteria
3. Commit the dev spec file to a new branch (e.g., dev-spec/pr-<number1>-<number2>-...).
4. Open a PR for the dev spec file, referencing all original PRs and the tracking issue.

This skill is fully automated via GitHub Actions and does not require local scripts. The workflow will:
- Trigger on workflow_dispatch with one or more PR numbers as input
- Create the tracking issue in `Gradient/GradientV1` first
- Use the GitHub API to fetch PR details and diffs
- Generate the dev spec markdown
- Commit and push to a new branch
- Open a PR for the dev spec

See [automation/scripts/publish_dev_spec_from_pr.sh](automation/scripts/publish_dev_spec_from_pr.sh), [automation/scripts/dev_spec_from_pr.sh](automation/scripts/dev_spec_from_pr.sh), and [.github/workflows/publish_dev_spec_from_pr.yml](.github/workflows/publish_dev_spec_from_pr.yml).
