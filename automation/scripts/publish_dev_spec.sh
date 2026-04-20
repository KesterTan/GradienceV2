#!/usr/bin/env bash
set -euo pipefail

# Usage: ./publish_dev_spec.sh <repo> <user_story_number>
# Example: ./publish_dev_spec.sh KesterTan/GradienceV2 3

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <user_story_number>"
  exit 1
fi

REPO="$1"
USER_STORY_NUM="$2"
USER_STORY_MD="tests/human-acceptance/user-story-${USER_STORY_NUM}.md"
DEV_SPEC_MD="DEV_SPEC_USER_STORY_${USER_STORY_NUM}.md"
BRANCH="dev-spec/user-story-${USER_STORY_NUM}"

command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }

if [[ ! -f "$USER_STORY_MD" ]]; then
  echo "User story markdown not found: $USER_STORY_MD"
  exit 1
fi

# Generate dev spec from user story (simple template, can be improved)
cat > "$DEV_SPEC_MD" <<EOF
# Development Specification — User Story ${USER_STORY_NUM}

## 0) Scope / user story
**User story in scope:**
$(awk '/^# User Story/{flag=1; next} /^#/{flag=0} flag' "$USER_STORY_MD" | head -n 1)

---

## 0.1) Ownership and merge metadata
- **Primary owner:** $(git config user.name)
- **Date created:** $(date +%Y-%m-%d)

---

## 1) Acceptance Criteria
$(awk '/Acceptance Criteria/{flag=1; next} /^#/{flag=0} flag' "$USER_STORY_MD")

---

## 2) Implementation Plan
(Add implementation plan here)

---

## 3) Risks / Assumptions
(Add risks/assumptions here)
EOF

# Create branch, commit, push
CURRENT_BRANCH=$(git branch --show-current)
git checkout -b "$BRANCH"
git add "$DEV_SPEC_MD"
git commit -m "dev spec for user story #${USER_STORY_NUM}"
git push -u origin "$BRANCH"

# Create PR
PR_TITLE="Dev spec for user story #${USER_STORY_NUM}"
PR_BODY="This PR adds a development specification for user story #${USER_STORY_NUM}.\n\nLinked user story: #${USER_STORY_NUM}"
PR_URL=$(gh pr create -R "$REPO" --base main --head "$BRANCH" --title "$PR_TITLE" --body "$PR_BODY")

echo "Created dev spec: $DEV_SPEC_MD"
echo "Created PR: $PR_URL"
