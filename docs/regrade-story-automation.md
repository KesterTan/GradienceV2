# Regrade Story Automation Workflow

This document makes the regrade-request story workflow repeatable for another teammate.

## Scope
Story: `Student regrade request with instructor resolution`

## Automated code generation workflow
1. Generate a structured implementation prompt from the story JSON:
   - `node scripts/llm/build-story-prompt.mjs implementation`
2. Paste that prompt into your LLM/agent and ask it to produce a minimal implementation plan and code changes.
3. Apply the suggested changes in a feature branch, then review the output manually before commit.

Human responsibilities:
- Product decisions
- Secrets and repo configuration
- Fixing incorrect generated code
- Final merge approval

## Automated testing workflow
1. Create a test work item and branch:
   - `automation/scripts/start_test_workflow.sh <repo> <story-issue-number> regrade-requests route-tests`
2. Generate the test-authoring prompt:
   - `node scripts/llm/build-story-prompt.mjs tests`
3. Use the LLM output to add or update executable tests.
4. Open a PR and verify CI in `.github/workflows/test.yml`.

Human responsibilities:
- Review whether the tests actually cover acceptance criteria
- Reject low-value tests
- Review CI failures and fix mocks/fixtures when the model is wrong

## Automated code review workflow
- Workflow file: `.github/workflows/llm-pr-review.yml`
- Trigger: PR opened, synchronized, reopened, or marked ready for review
- Visible output: PR comment titled `Automated LLM Review`

## Automated development specification workflow
- Workflow file: `.github/workflows/dev-spec-on-approval.yml`
- Trigger: approved PR review
- Required label for this story: `story:3`
- Visible output:
  - tracking GitHub issue
  - auto-generated docs PR that updates `DEV_SPEC_REGRADE_REQUESTS.md`

## Submission evidence to collect for this story
- merged feature PR URL
- PR URL showing automated LLM review output
- CI run URL for regrade tests
- approved docs PR URL for the dev spec update
- tracking issue URL for the dev spec
- chat/shareable log URLs used to drive implementation and tests
