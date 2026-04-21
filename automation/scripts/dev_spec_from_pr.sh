#!/usr/bin/env bash
set -euo pipefail

# Usage: ./dev_spec_from_pr.sh <pr_json> <pr_diff>
# Expects pr_json (from gh pr view --json ...) and pr_diff (from gh pr diff)

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <pr_json> <pr_diff>"
  exit 1
fi

PR_JSON="$1"
PR_DIFF="$2"

# Check if PR_JSON is an array (multi-PR) or single object
if jq -e 'type == "array"' "$PR_JSON" >/dev/null; then
  PR_NUMS=$(jq -r '.[].number' "$PR_JSON" | paste -sd '_' -)
  DEV_SPEC_FILE="DEV_SPEC_PR_${PR_NUMS}.md"
  {
    echo "# Development Specification — PRs $(jq -r '.[].number' "$PR_JSON" | paste -sd ', ' -)"
    echo
    echo "## 0) Scope / PR summaries"
    PR_COUNT=$(jq 'length' "$PR_JSON")
    for i in $(seq 0 $((PR_COUNT-1))); do
      PR_TITLE=$(jq -r ".[$i].title" "$PR_JSON")
      PR_AUTHOR=$(jq -r ".[$i].author.login" "$PR_JSON")
      PR_LINKED_ISSUES=$(jq -r ".[$i].linkedIssues[]?.number" "$PR_JSON" | xargs -I{} echo "#{}" | paste -sd ", " -)
      PR_BODY=$(jq -r ".[$i].body" "$PR_JSON")
      PR_NUM=$(jq -r ".[$i].number" "$PR_JSON")
      echo "### PR #$PR_NUM"
      echo "- **Title:** $PR_TITLE"
      echo "- **Author:** $PR_AUTHOR"
      echo "- **Linked issues:** ${PR_LINKED_ISSUES:-None}"
      echo
      echo "**Summary:**"
      echo "$PR_BODY"
      echo
    done
    echo '---'
    echo '## 1) Diff Summary'
    echo '```
'$(head -n 80 "$PR_DIFF")'
```
'
    echo '---'
    echo '## 2) Risks / Assumptions'
    echo '(Add risks or assumptions here based on PR bodies or code changes)'
    echo '---'
    echo '## 3) Validation / Acceptance Criteria'
    echo '(Add validation steps or acceptance criteria here)'
  } > "$DEV_SPEC_FILE"
else
  PR_NUM=$(jq -r '.number' "$PR_JSON")
  PR_TITLE=$(jq -r '.title' "$PR_JSON")
  PR_BODY=$(jq -r '.body' "$PR_JSON")
  PR_AUTHOR=$(jq -r '.author.login' "$PR_JSON")
  PR_LINKED_ISSUES=$(jq -r '.linkedIssues[]?.number' "$PR_JSON" | xargs -I{} echo "#{}" | paste -sd ", " -)
  cat > DEV_SPEC_PR_${PR_NUM}.md <<EOF
# Development Specification — PR #${PR_NUM}

## 0) Scope / PR summary
**PR title:** $PR_TITLE
**PR author:** $PR_AUTHOR
**Linked issues:** ${PR_LINKED_ISSUES:-None}

**Summary:**
$PR_BODY

---

## 1) Diff Summary

```
$(head -n 40 "$PR_DIFF")
```

---

## 2) Risks / Assumptions
(Add risks or assumptions here based on PR body or code changes)

---

## 3) Validation / Acceptance Criteria
(Add validation steps or acceptance criteria here)
EOF
fi
