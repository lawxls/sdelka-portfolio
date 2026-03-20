#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)(npm|npx|yarn|bun)\s'; then
  echo "Blocked: use pnpm instead of npm/npx/yarn/bun" >&2
  exit 2
fi

exit 0
