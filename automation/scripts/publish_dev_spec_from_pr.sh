#!/usr/bin/env bash
set -euo pipefail

# Usage: ./publish_dev_spec_from_pr.sh <repo> <comma-separated-pr-numbers>
# Example: ./publish_dev_spec_from_pr.sh KesterTan/GradienceV2 12,15,18

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <comma-separated-pr-numbers>"
  exit 1
fi

REPO="$1"
PR_NUMBERS_RAW="$2"
IFS=',' read -ra PRS <<< "$PR_NUMBERS_RAW"

# Fetch PR details and diffs
> prs.json
> prs.diff
for PR_NUM in "${PRS[@]}"; do
  PR_NUM_TRIM=$(echo "$PR_NUM" | xargs)
  gh pr view "$PR_NUM_TRIM" --json title,body,number,headRefName,baseRefName,author,files,commits,additions,deletions,changedFiles,labels,assignees,reviewRequests,linkedIssues >> prs.json
  echo -e "\n\n# Diff for PR $PR_NUM_TRIM\n" >> prs.diff
  gh pr diff "$PR_NUM_TRIM" >> prs.diff
done

# Generate dev spec markdown
bash automation/scripts/dev_spec_from_pr.sh prs.json prs.diff

# Create dev-spec branch, commit, and push
BRANCH=dev-spec/pr-$(echo "$PR_NUMBERS_RAW" | tr ',' '-')
DEV_SPEC_FILE=DEV_SPEC_PR_$(echo "$PR_NUMBERS_RAW" | tr ',' '_').md
git checkout -b $BRANCH
git add $DEV_SPEC_FILE
git commit -m "dev spec for PR(s) $PR_NUMBERS_RAW"
git push origin $BRANCH

# Open PR for dev spec
gh pr create --base main --head $BRANCH --title "Dev spec for PR(s) $PR_NUMBERS_RAW" --body "This PR adds a development specification for PR(s) $PR_NUMBERS_RAW."
