#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <repo>"
  echo "Example: $0 GradientV1/YOUR_REPO"
  exit 1
fi

REPO="$1"

command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "Not inside a git repository"
  exit 1
}

CURRENT_BRANCH=$(git branch --show-current)
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "Could not determine current branch"
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree has uncommitted changes."
  echo "Commit or stash them first, or let Claude prepare the commit before running this script."
  exit 1
fi

BASE_BRANCH=$(gh repo view "$REPO" --json defaultBranchRef --jq '.defaultBranchRef.name')

# Try to infer issue number from branch name or latest commit text
ISSUE_NUMBER=""
if [[ "$CURRENT_BRANCH" =~ ([0-9]+) ]]; then
  ISSUE_NUMBER="${BASH_REMATCH[1]}"
fi

PR_TITLE=$(git log -1 --pretty=%s)
PR_BODY_FILE=$(mktemp)

{
  echo "## Summary"
  echo "- Replace with a concise summary of the story implemented."
  echo
  echo "## Linked Issue"
  if [[ -n "$ISSUE_NUMBER" ]]; then
    echo "- Closes #$ISSUE_NUMBER"
  else
    echo "- Add issue link here"
  fi
  echo
  echo "## Changes"
  echo "### Backend"
  echo "- Add backend changes"
  echo
  echo "### Frontend"
  echo "- Add frontend changes"
  echo
  echo "### Tests"
  echo "- Add test coverage / verification"
  echo
  echo "## Risks / Assumptions"
  echo "- Add known risks or assumptions"
  echo
  echo "## Validation"
  echo "- [ ] Tests run"
  echo "- [ ] Manual verification completed"
} > "$PR_BODY_FILE"

git push -u origin "$CURRENT_BRANCH"

PR_URL=$(gh pr create \
  -R "$REPO" \
  --base "$BASE_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "$PR_TITLE" \
  --body-file "$PR_BODY_FILE")

rm -f "$PR_BODY_FILE"

echo "Created PR: $PR_URL"