#!/usr/bin/env bash
set -euo pipefail

# Usage: ./publish_dev_spec_and_publish_pr.sh <repo> <user_story_number>
# Example: ./publish_dev_spec_and_publish_pr.sh KesterTan/GradienceV2 3

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <user_story_number>"
  exit 1
fi

REPO="$1"
USER_STORY_NUM="$2"

# Step 1: Create dev spec, commit, push, and open PR
./automation/scripts/publish_dev_spec.sh "$REPO" "$USER_STORY_NUM"

# Step 2: Publish the PR (mark ready for review)
# Find the PR number for the branch
gh pr list -R "$REPO" --head "dev-spec/user-story-${USER_STORY_NUM}" --json number,state | grep -q 'OPEN' || {
  echo "No open PR found for dev-spec/user-story-${USER_STORY_NUM}"
  exit 1
}
PR_NUMBER=$(gh pr list -R "$REPO" --head "dev-spec/user-story-${USER_STORY_NUM}" --json number --jq '.[0].number')

gh pr ready -R "$REPO" "$PR_NUMBER"
echo "Published PR #$PR_NUMBER for dev spec user story #$USER_STORY_NUM"
