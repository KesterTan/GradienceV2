#!/usr/bin/env bash
set -euo pipefail

# Usage: ./publish_dev_spec_from_pr.sh <repo> <comma-separated-pr-numbers> [issue-repo]
# Example: ./publish_dev_spec_from_pr.sh KesterTan/GradienceV2 12,15,18 Gradient/GradientV1

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <comma-separated-pr-numbers> [issue-repo]"
  exit 1
fi

REPO="$1"
PR_NUMBERS_RAW="$2"
ISSUE_REPO="${3:-Gradient/GradientV1}"
IFS=',' read -ra PRS <<< "$PR_NUMBERS_RAW"

command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

# Fetch PR details and diffs
> "$TMP_DIR/prs.diff"
> "$TMP_DIR/pr_urls.txt"

for PR_NUM in "${PRS[@]}"; do
  PR_NUM_TRIM=$(echo "$PR_NUM" | xargs)
  gh pr view "$PR_NUM_TRIM" -R "$REPO" --json title,body,number,url,headRefName,baseRefName,author,files,commits,additions,deletions,changedFiles,labels,assignees,reviewRequests,linkedIssues > "$TMP_DIR/pr_${PR_NUM_TRIM}.json"
  jq -r '.url' "$TMP_DIR/pr_${PR_NUM_TRIM}.json" >> "$TMP_DIR/pr_urls.txt"
  echo -e "\n\n# Diff for PR $PR_NUM_TRIM\n" >> "$TMP_DIR/prs.diff"
  gh pr diff "$PR_NUM_TRIM" -R "$REPO" >> "$TMP_DIR/prs.diff"
done

# Build a valid JSON array of PR objects
jq -s '.' "$TMP_DIR"/pr_*.json > "$TMP_DIR/prs.json"

# Create tracking issue BEFORE generating dev spec
ISSUE_TITLE="Dev spec request for PR(s) $PR_NUMBERS_RAW from $REPO"
ISSUE_BODY=$(cat <<EOF
Create and publish a development specification for the following PR(s) in $REPO:

$(sed 's/^/- /' "$TMP_DIR/pr_urls.txt")

This tracking issue was created automatically before dev spec generation.
EOF
)

TRACKING_ISSUE_URL=$(gh issue create -R "$ISSUE_REPO" --title "$ISSUE_TITLE" --body "$ISSUE_BODY")
echo "Created tracking issue: $TRACKING_ISSUE_URL"

# Generate dev spec markdown (includes tracking issue reference)
DEV_SPEC_FILE=$(bash automation/scripts/dev_spec_from_pr.sh "$TMP_DIR/prs.json" "$TMP_DIR/prs.diff" "$TRACKING_ISSUE_URL")

# Create dev-spec branch, commit, and push
NORMALIZED_PRS=$(jq -r '.[].number' "$TMP_DIR/prs.json" | paste -sd '-' -)
BRANCH="dev-spec/pr-${NORMALIZED_PRS}"
git checkout -b $BRANCH
git add "$DEV_SPEC_FILE"
git commit -m "dev spec for PR(s) $PR_NUMBERS_RAW"
git push origin $BRANCH

# Open PR for dev spec
gh pr create -R "$REPO" --base main --head "$BRANCH" --title "Dev spec for PR(s) $PR_NUMBERS_RAW" --body "This PR adds a development specification for PR(s) $PR_NUMBERS_RAW.\n\nTracking issue: $TRACKING_ISSUE_URL"
