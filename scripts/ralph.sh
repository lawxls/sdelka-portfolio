#!/bin/bash
set -eo pipefail

# RALPH — run Claude on GitHub issues, one at a time
# Usage: bash scripts/ralph.sh 1 2 3
#   Processes each issue sequentially.
#   If no numbers given, fetches all open issues and processes them all.
#   Creates a PR with all changes when done.

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Parse issue numbers from args, supporting:
#   ralph 1 2 3
#   ralph 1, 2, 3
#   ralph [1, 2, 3]
# Strip leading "--" passed by pnpm
[[ "${1:-}" == "--" ]] && shift
RAW_ARGS="$*"
RAW_ARGS="${RAW_ARGS//[\[\],]/ }"
read -ra ISSUE_NUMBERS <<< "$RAW_ARGS"

if [ ${#ISSUE_NUMBERS[@]} -eq 0 ]; then
  # No args — fetch all open issue numbers
  mapfile -t ISSUE_NUMBERS < <(gh issue list --state open --json number --jq '.[].number' --limit 100)
fi

if [ ${#ISSUE_NUMBERS[@]} -eq 0 ]; then
  echo "No issues to process."
  exit 0
fi

echo "Processing ${#ISSUE_NUMBERS[@]} issue(s): ${ISSUE_NUMBERS[*]}"
echo ""

# --- Create temp work branch (will be renamed later by Claude) ---
TEMP_BRANCH="claude/ralph-$(date +%s)"
git checkout -b "$TEMP_BRANCH"

WORKER_PROMPT=$(cat "$REPO_ROOT/scripts/worker-prompt.md")
COMPLETED_ISSUES=()
RALPH_COMMIT_SHAS=()

for num in "${ISSUE_NUMBERS[@]}"; do
  echo "=========================================="
  echo "RALPH — Issue #$num"
  echo "=========================================="

  # --- Fetch issue ---
  ISSUE_JSON=$(gh issue view "$num" --json number,title,body,comments)

  # --- Fetch recent RALPH commits ---
  RALPH_COMMITS=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

  # --- Build prompt ---
  FULL_PROMPT="## Your Issue

${ISSUE_JSON}

## Previous RALPH Commits

${RALPH_COMMITS}

${WORKER_PROMPT}"

  # --- Run Claude, capture output ---
  echo "Running Claude..."
  tmpfile=$(mktemp)
  echo "$FULL_PROMPT" | claude -p \
    --dangerously-skip-permissions \
    --output-format stream-json \
    --verbose \
  | grep --line-buffered '^{' \
  | tee "$tmpfile" \
  | jq --unbuffered -rj 'select(.type == "assistant").message.content[]? | select(.type == "text").text // empty | gsub("\n"; "\r\n") | . + "\r\n\n"'

  # --- Extract result ---
  RESULT=$(jq -r 'select(.type == "result").result // empty' "$tmpfile")
  rm -f "$tmpfile"

  # --- Extract issue comment and post it ---
  COMMENT=$(echo "$RESULT" | sed -n '/<issue_comment>/,/<\/issue_comment>/p' | sed '1d;$d')
  if [ -n "$COMMENT" ]; then
    echo "Commenting on issue #$num..."
    gh issue comment "$num" --body "$COMMENT"
  fi

  # --- Close the issue ---
  echo "Closing issue #$num..."
  gh issue close "$num"

  COMPLETED_ISSUES+=("$num")

  # Capture the commit SHA from this iteration
  LATEST_SHA=$(git rev-parse HEAD)
  RALPH_COMMIT_SHAS+=("$LATEST_SHA")

  echo ""
  echo "Issue #$num complete."
  echo ""
done

# --- Check if there are any changes ---
if git diff --quiet main "$TEMP_BRANCH" 2>/dev/null && git diff --cached --quiet; then
  echo "No changes produced."
  git checkout main
  git branch -d "$TEMP_BRANCH"
  exit 0
fi

# --- Simplify pass ---
echo "=========================================="
echo "RALPH — Simplify"
echo "=========================================="

COMMIT_LIST=$(IFS=,; echo "${RALPH_COMMIT_SHAS[*]}")

echo "Running /simplify on commits: $COMMIT_LIST"
echo "/simplify focus on ${COMMIT_LIST} commits. After simplifying, if you made any changes, commit them with a 'RALPH: simplify' prefix message." | claude -p \
  --dangerously-skip-permissions \
  --verbose

# --- Create PR via Claude ---
echo ""
echo "=========================================="
echo "RALPH — Creating PR"
echo "=========================================="

ISSUES_REF=""
for num in "${COMPLETED_ISSUES[@]}"; do
  ISSUES_REF="${ISSUES_REF}#${num} "
done

DIFF=$(git diff main..."$TEMP_BRANCH")
COMMIT_LOG=$(git log main.."$TEMP_BRANCH" --format="%h %s")

PR_PROMPT="You need to create a GitHub pull request for this RALPH run.

## Context

Current branch: $TEMP_BRANCH
Completed issues: ${ISSUES_REF}

## Commits on this branch

${COMMIT_LOG}

## Diff

${DIFF}

## Instructions

1. Rename the current branch to a descriptive name using: git branch -m <new-name>
   Use format: claude/<short-descriptive-slug> (e.g. claude/add-config-and-greet-script)
   The slug should describe the actual changes, not just say 'ralph'.

2. Push the renamed branch: git push -u origin HEAD

3. Create a PR with gh pr create. The PR should have:
   - A clear, concise title (under 70 chars) that describes the changes
   - A compact body with a short summary of what was done and 'Closes #N' for each issue

Do NOT output anything else. Just execute the commands."

echo "Running Claude to create PR..."
echo "$PR_PROMPT" | claude -p \
  --dangerously-skip-permissions \
  --verbose

echo ""
echo "RALPH complete. Processed ${#COMPLETED_ISSUES[@]} issue(s)."
