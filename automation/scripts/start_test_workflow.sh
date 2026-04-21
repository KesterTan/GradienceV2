#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <repo> <story-issue-number> <story-slug> <test-scope>"
  echo "Example: $0 GradientV1/GradienceV2 52 regrade-requests route-tests"
  exit 1
fi

REPO="$1"
STORY_ISSUE="$2"
STORY_SLUG="$3"
TEST_SCOPE="$4"

command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not inside a git repository"
  exit 1
}

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

BRANCH_NAME="tests/${STORY_SLUG}-${TEST_SCOPE}"
ISSUE_TITLE="Tests: ${STORY_SLUG} (${TEST_SCOPE})"

ISSUE_BODY=$(cat <<EOF
## Purpose
Track automated test authoring and check-in for story #${STORY_ISSUE}.

## Linked story
- Relates to #${STORY_ISSUE}

## Workflow expectations
- [ ] LLM-assisted test prompt used
- [ ] Tests added or updated in repo
- [ ] Test branch created
- [ ] Commit references this issue
- [ ] PR reviewed before merge
- [ ] CI run verified
EOF
)

ISSUE_URL=$(gh issue create \
  -R "$REPO" \
  --title "$ISSUE_TITLE" \
  --body "$ISSUE_BODY")

ISSUE_NUMBER="${ISSUE_URL##*/}"

git checkout -b "$BRANCH_NAME"

echo "Created issue: $ISSUE_URL"
echo "Created branch: $BRANCH_NAME"
echo "Suggested commit trailer: Refs #$ISSUE_NUMBER"
