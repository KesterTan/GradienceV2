#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <repo> <story-json-file>"
  echo "Example: $0 GradientV1/your-repo story1.json"
  exit 1
fi

REPO="$1"
STORY_JSON="$2"

ORG_OWNER="GradientV1"
PROJECT_NUMBER="1"

# Validate dependencies
command -v gh >/dev/null 2>&1 || { echo "gh is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }

# Validate auth
gh auth status >/dev/null
gh auth refresh -s project >/dev/null 2>&1 || true

TITLE=$(jq -r '.title' "$STORY_JSON")
USER_STORY=$(jq -r '.user_story' "$STORY_JSON")
RATIONALE=$(jq -r '.rationale' "$STORY_JSON")
PRIORITY=$(jq -r '.priority' "$STORY_JSON")
SIZE=$(jq -r '.size' "$STORY_JSON")
SPRINT=$(jq -r '.sprint' "$STORY_JSON")

MACHINE_AC=$(jq -r '.machine_acceptance_criteria[]? | "- [ ] " + .' "$STORY_JSON")
HUMAN_AC=$(jq -r '.human_acceptance_criteria[]? | "- [ ] " + .' "$STORY_JSON")
IMPLEMENTATION_PLAN=$(jq -r '.implementation_plan[]? | "- " + .' "$STORY_JSON")
BACKEND_CHANGES=$(jq -r '.backend_changes[]? | "- " + .' "$STORY_JSON")
FRONTEND_CHANGES=$(jq -r '.frontend_changes[]? | "- " + .' "$STORY_JSON")
TEST_CHANGES=$(jq -r '.test_changes[]? | "- " + .' "$STORY_JSON")
RISKS=$(jq -r '.known_risks_assumptions[]? | "- " + .' "$STORY_JSON")

BODY=$(cat <<EOF
## User Story
$USER_STORY

## Why this is the right next increment
$RATIONALE

## Machine Acceptance Criteria
$MACHINE_AC

## Human Acceptance Criteria
$HUMAN_AC

## Implementation Plan
$IMPLEMENTATION_PLAN

## Backend Changes
$BACKEND_CHANGES

## Frontend Changes
$FRONTEND_CHANGES

## Test Changes
$TEST_CHANGES

## Known Risks / Assumptions
$RISKS
EOF
)

ensure_label() {
  local label_name="$1"
  if ! gh label list -R "$REPO" --limit 200 --json name --jq '.[].name' | grep -Fxq "$label_name"; then
    gh label create "$label_name" -R "$REPO" --color BFDADC --description "Auto-created by story automation" >/dev/null
  fi
}

ensure_label "$SPRINT"
ensure_label "priority:$PRIORITY"
ensure_label "size:$SIZE"

ISSUE_URL=$(gh issue create \
  -R "$REPO" \
  --title "$TITLE" \
  --body "$BODY" \
  --label "$SPRINT" \
  --label "priority:$PRIORITY" \
  --label "size:$SIZE")

echo "Created issue: $ISSUE_URL"

# Add issue to org project
ITEM_JSON=$(gh project item-add "$PROJECT_NUMBER" \
  --owner "$ORG_OWNER" \
  --url "$ISSUE_URL" \
  --format json)

ITEM_ID=$(echo "$ITEM_JSON" | jq -r '.id // empty')
if [[ -z "$ITEM_ID" ]]; then
  # fallback: find the item by URL
  ITEM_ID=$(gh project item-list "$PROJECT_NUMBER" \
    --owner "$ORG_OWNER" \
    --format json \
    | jq -r --arg url "$ISSUE_URL" '.items[] | select(.content.url == $url) | .id' \
    | head -n 1)
fi

PROJECT_ID=$(gh project view "$PROJECT_NUMBER" \
  --owner "$ORG_OWNER" \
  --format json \
  | jq -r '.id')

FIELD_JSON=$(gh project field-list "$PROJECT_NUMBER" \
  --owner "$ORG_OWNER" \
  --format json)

set_single_select_field() {
  local field_name="$1"
  local option_name="$2"

  local field_id
  field_id=$(echo "$FIELD_JSON" | jq -r --arg name "$field_name" '
    .fields[] | select(.name == $name) | .id
  ' | head -n 1)

  if [[ -z "$field_id" ]]; then
    echo "Project field '$field_name' not found, skipping."
    return 0
  fi

  local option_id
  option_id=$(echo "$FIELD_JSON" | jq -r --arg name "$field_name" --arg opt "$option_name" '
    .fields[]
    | select(.name == $name)
    | .options[]
    | select(.name == $opt)
    | .id
  ' | head -n 1)

  if [[ -z "$option_id" ]]; then
    echo "Option '$option_name' not found in field '$field_name', skipping."
    return 0
  fi

  gh project item-edit \
    --id "$ITEM_ID" \
    --project-id "$PROJECT_ID" \
    --field-id "$field_id" \
    --single-select-option-id "$option_id" >/dev/null

  echo "Set project field $field_name = $option_name"
}

# Optional project fields if your board has them
set_single_select_field "Priority" "$PRIORITY"
set_single_select_field "Size" "$SIZE"
set_single_select_field "Sprint" "$SPRINT"

echo "Done."
echo "Issue URL: $ISSUE_URL"