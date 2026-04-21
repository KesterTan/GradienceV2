#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./dev_spec_from_pr.sh <pr_json> <pr_diff> [tracking_issue_url]
#
# Inputs:
# - pr_json: JSON file containing either:
#   a) a single PR object, or
#   b) an array of PR objects
# - pr_diff: combined diff text file
# - tracking_issue_url: optional issue URL created before dev-spec generation

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <pr_json> <pr_diff> [tracking_issue_url]"
  exit 1
fi

PR_JSON="$1"
PR_DIFF="$2"
TRACKING_ISSUE_URL="${3:-}"

if [[ ! -f "$PR_JSON" ]]; then
  echo "PR JSON file not found: $PR_JSON"
  exit 1
fi

if [[ ! -f "$PR_DIFF" ]]; then
  echo "PR diff file not found: $PR_DIFF"
  exit 1
fi

# Normalize to array for simpler processing.
if jq -e 'type == "array"' "$PR_JSON" >/dev/null; then
  PRS_JSON="$PR_JSON"
else
  PRS_JSON=$(mktemp)
  jq -s '.' "$PR_JSON" > "$PRS_JSON"
fi

PR_COUNT=$(jq 'length' "$PRS_JSON")
if [[ "$PR_COUNT" -eq 0 ]]; then
  echo "No PR records found in $PR_JSON"
  exit 1
fi

PR_NUMS_UNDERSCORE=$(jq -r '.[].number' "$PRS_JSON" | paste -sd '_' -)
PR_NUMS_COMMA=$(jq -r '.[].number' "$PRS_JSON" | paste -sd ', ' -)
DEV_SPEC_FILE="DEV_SPEC_PR_${PR_NUMS_UNDERSCORE}.md"

{
  if [[ "$PR_COUNT" -eq 1 ]]; then
    echo "# Development Specification — PR #${PR_NUMS_COMMA}"
  else
    echo "# Development Specification — PRs ${PR_NUMS_COMMA}"
  fi

  echo
  echo "## 0) Scope / PR summaries"

  if [[ -n "$TRACKING_ISSUE_URL" ]]; then
    echo "- **Tracking issue (created before dev spec):** $TRACKING_ISSUE_URL"
    echo
  fi

  for i in $(seq 0 $((PR_COUNT - 1))); do
    PR_NUM=$(jq -r ".[$i].number" "$PRS_JSON")
    PR_TITLE=$(jq -r ".[$i].title" "$PRS_JSON")
    PR_AUTHOR=$(jq -r ".[$i].author.login // \"unknown\"" "$PRS_JSON")
    PR_URL=$(jq -r ".[$i].url // \"\"" "$PRS_JSON")
    PR_BODY=$(jq -r ".[$i].body // \"\"" "$PRS_JSON")
    PR_LINKED_ISSUES=$(jq -r ".[$i].linkedIssues[]?.number" "$PRS_JSON" | sed 's/^/#/' | paste -sd ', ' -)

    echo "### PR #$PR_NUM"
    echo "- **Title:** $PR_TITLE"
    echo "- **Author:** $PR_AUTHOR"
    if [[ -n "$PR_URL" ]]; then
      echo "- **URL:** $PR_URL"
    fi
    echo "- **Linked issues:** ${PR_LINKED_ISSUES:-None}"
    echo
    echo "**Summary:**"
    if [[ -n "$PR_BODY" ]]; then
      echo "$PR_BODY"
    else
      echo "(No PR body provided.)"
    fi
    echo
  done

  echo "---"
  echo "## 1) Diff Summary"
  echo
  echo '```diff'
  head -n 200 "$PR_DIFF"
  echo '```'
  echo
  echo "---"
  echo "## 2) Risks / Assumptions"
  echo "(Add risks or assumptions here based on PR bodies or code changes)"
  echo
  echo "---"
  echo "## 3) Validation / Acceptance Criteria"
  echo "(Add validation steps or acceptance criteria here)"
} > "$DEV_SPEC_FILE"

echo "$DEV_SPEC_FILE"
