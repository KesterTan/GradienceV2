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
TEMP_PRS_JSON=""
cleanup() {
  if [[ -n "$TEMP_PRS_JSON" && -f "$TEMP_PRS_JSON" ]]; then
    rm -f "$TEMP_PRS_JSON"
  fi
}
trap cleanup EXIT

if jq -e 'type == "array"' "$PR_JSON" >/dev/null; then
  PRS_JSON="$PR_JSON"
else
  TEMP_PRS_JSON=$(mktemp)
  PRS_JSON="$TEMP_PRS_JSON"
  jq -s '.' "$PR_JSON" > "$PRS_JSON"
fi

PR_COUNT=$(jq 'length' "$PRS_JSON")
if [[ "$PR_COUNT" -eq 0 ]]; then
  echo "No PR records found in $PR_JSON"
  exit 1
fi

PR_NUMS_UNDERSCORE=$(jq -r 'map(.number | tostring) | join("_")' "$PRS_JSON")
PR_NUMS_COMMA=$(jq -r 'map(.number | tostring) | join(", ")' "$PRS_JSON")
DEV_SPEC_FILE="DEV_SPEC_PR_${PR_NUMS_UNDERSCORE}.md"

{
  if [[ "$PR_COUNT" -eq 1 ]]; then
    echo "# Development Specification — PR #${PR_NUMS_COMMA}"
  else
    echo "# Development Specification — PRs ${PR_NUMS_COMMA}"
  fi

  echo
  echo "## 0) Scope / PR Summaries"

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
    PR_LINKED_ISSUES=$(jq -r ".[$i].closingIssuesReferences // [] | map(.number | tostring | \"#\" + .) | join(\", \")" "$PRS_JSON")
    PR_MERGED_AT=$(jq -r ".[$i].mergedAt // \"(not yet merged)\"" "$PRS_JSON")
    PR_REVIEWERS=$(jq -r ".[$i].reviews // [] | map(.author.login // \"unknown\") | unique | join(\", \")" "$PRS_JSON")

    echo "### PR #$PR_NUM"
    echo "- **Title:** $PR_TITLE"
    echo "- **Author:** $PR_AUTHOR"
    if [[ -n "$PR_URL" ]]; then
      echo "- **URL:** $PR_URL"
    fi
    echo "- **Merged at:** $PR_MERGED_AT"
    echo "- **Reviewers:** ${PR_REVIEWERS:-(none recorded)}"
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
  echo "## 1) Ownership"
  echo
  echo "| Role | Person |"
  echo "|------|--------|"
  for i in $(seq 0 $((PR_COUNT - 1))); do
    PR_NUMBER=$(jq -r ".[$i].number // \"?\"" "$PRS_JSON")
    PR_AUTHOR=$(jq -r ".[$i].author.login // \"unknown\"" "$PRS_JSON")
    PR_REVIEWERS=$(jq -r ".[$i].reviews // [] | map(.author.login // \"unknown\") | unique | join(\", \")" "$PRS_JSON")
    echo "| Primary owner — PR #$PR_NUMBER (author) | $PR_AUTHOR |"
    echo "| Secondary owner(s) — PR #$PR_NUMBER (reviewers) | ${PR_REVIEWERS:-(none recorded)} |"
  done
  echo
  echo "---"
  echo "## 2) Merge Date"
  echo
  for i in $(seq 0 $((PR_COUNT - 1))); do
    PR_NUM=$(jq -r ".[$i].number" "$PRS_JSON")
    PR_MERGED_AT=$(jq -r ".[$i].mergedAt // \"(not yet merged)\"" "$PRS_JSON")
    echo "- **PR #$PR_NUM merged at:** $PR_MERGED_AT"
  done
  echo
  echo "---"
  echo "## 3) Architecture Diagram"
  echo
  echo "> Show all architectural components and **where they execute** (client / server / cloud / edge / device)."
  echo "> Use Mermaid. Label each node with its execution context."
  echo
  echo '```mermaid'
  echo "graph LR"
  echo "    %% TODO: fill in components and their execution contexts"
  echo "    subgraph CLIENT[\"Client (external)\"]"
  echo "        caller[API Caller]"
  echo "    end"
  echo "    subgraph SERVER[\"Server (self-hosted)\"]"
  echo "        app[Application]"
  echo "    end"
  echo "    subgraph CLOUD[\"Cloud (external)\"]"
  echo "        ext[External Service]"
  echo "    end"
  echo "    caller --> app"
  echo "    app --> ext"
  echo '```'
  echo
  echo "---"
  echo "## 4) Information Flow Diagram"
  echo
  echo "> Show which **user information and application data** moves between architectural components and the direction of flow."
  echo "> Use Mermaid. Label each edge with the data item and its direction."
  echo
  echo '```mermaid'
  echo "flowchart LR"
  echo "    %% TODO: fill in data items and flow directions"
  echo "    Client -->|\"(data item)\"| Server"
  echo "    Server -->|\"(data item)\"| ExternalService"
  echo "    ExternalService -->|\"(data item)\"| Server"
  echo "    Server -->|\"(data item)\"| Client"
  echo '```'
  echo
  echo "---"
  echo "## 5) Class Diagram"
  echo
  echo "> Show **all** classes relevant to this user story's implementation in superclass/subclass relationships."
  echo "> Include every class and interface. This diagram will be verified for completeness."
  echo
  echo '```mermaid'
  echo "classDiagram"
  echo "    %% TODO: fill in all classes, interfaces, and inheritance relationships"
  echo "    class ExampleBase"
  echo "    class ExampleChild"
  echo "    ExampleBase <|-- ExampleChild"
  echo '```'
  echo
  echo "---"
  echo "## 6) Class Reference"
  echo
  echo "> For every class listed in section 5, provide all **public** fields and methods (grouped by concept),"
  echo "> then all **private** fields and methods (grouped by concept). Explain the purpose of each."
  echo
  echo "(TODO: fill in complete class reference)"
  echo
  echo "---"
  echo "## 7) Technologies, Libraries, and APIs"
  echo
  echo "> List every technology, library, and API used that you are **not** writing yourself."
  echo "> Include language, common libraries, and required tools. Do not omit anything."
  echo
  echo "| Technology | Version | Used for | Why chosen over alternatives | Source / Author / Docs |"
  echo "|------------|---------|----------|------------------------------|------------------------|"
  echo "| (TODO) | | | | |"
  echo
  echo "---"
  echo "## 8) Data Stored in Long-Term Storage"
  echo
  echo "> For each data type stored in a database, explain the purpose of each field."
  echo "> Estimate storage size in bytes per record."
  echo
  echo "(TODO: list each database table/collection, field purposes, and per-record storage estimates)"
  echo
  echo "---"
  echo "## 9) Failure Modes"
  echo
  echo "> For each scenario below, describe the **user-visible** and **internally-visible** effects."
  echo
  echo "| Failure scenario | User-visible effect | Internally-visible effect |"
  echo "|------------------|--------------------|-----------------------------|"
  echo "| Process crash | | |"
  echo "| Lost all runtime state | | |"
  echo "| Erased all stored data | | |"
  echo "| Corrupt data detected in database | | |"
  echo "| Remote procedure call (RPC) failed | | |"
  echo "| Client overloaded | | |"
  echo "| Client out of RAM | | |"
  echo "| Database out of space | | |"
  echo "| Lost network connectivity | | |"
  echo "| Lost access to database | | |"
  echo "| Bot signs up and spams users | | |"
  echo
  echo "---"
  echo "## 10) Personally Identifying Information (PII)"
  echo
  echo "> List all PII stored in long-term storage. For each item:"
  echo "> - Justify why it must be kept"
  echo "> - How it is stored (encrypted at rest? field-level? hashed?)"
  echo "> - How it entered the system"
  echo "> - Which modules/components/classes/methods/fields it passed through before storage"
  echo "> - Which modules/components/classes/methods/fields it passes through after leaving storage"
  echo "> - Who on the team is responsible for securing each storage unit"
  echo "> - Audit procedures for routine and non-routine access"
  echo
  echo "### 10a) PII in Long-Term Storage"
  echo
  echo "(TODO: list each PII field, justification, storage mechanism, and data lineage)"
  echo
  echo "### 10b) Minors' PII"
  echo
  echo "- Is PII of minors (under 18) solicited or stored? (TODO: yes / no / explain)"
  echo "- Why? (TODO)"
  echo "- Is guardian permission solicited? (TODO: yes / no / explain)"
  echo "- Policy for ensuring minors' PII is inaccessible to anyone convicted or suspected of child abuse: (TODO)"
  echo
  echo "---"
  echo "## 11) Diff Summary"
  echo
  echo '```diff'
  head -n 200 "$PR_DIFF"
  echo '```'
  echo
  echo "---"
  echo "## 12) Risks / Assumptions"
  echo "(Add risks or assumptions here based on PR bodies or code changes)"
  echo
  echo "---"
  echo "## 13) Validation / Acceptance Criteria"
  echo "(Add validation steps or acceptance criteria here)"
} > "$DEV_SPEC_FILE"

echo "$DEV_SPEC_FILE"