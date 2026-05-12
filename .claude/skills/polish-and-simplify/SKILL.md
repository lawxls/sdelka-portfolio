---
name: polish-and-simplify
description: Run `make-interfaces-feel-better` then `simplify` on the current change set. Use when the user invokes /polish-and-simplify to apply UI polish followed by a code simplification pass.
---

# polish-and-simplify

Two-step quality pass over the current change set. Run sequentially, not in parallel — the simplify pass should see any polish edits.

## Steps

1. Invoke the `make-interfaces-feel-better` skill via the Skill tool. Apply its guidance to the UI code touched in this session (or, if none, to the files the user names).
2. After step 1's edits are in place, invoke the `simplify` skill via the Skill tool to review the resulting changes for reuse, quality, and efficiency, and fix any issues found.

## Rules

- Run the two skills sequentially in the order above. Never in parallel.
- Scope both passes to the files changed in this session unless the user names a different scope.
- If step 1 makes no changes, still run step 2 — simplify acts on whatever is currently changed.
- Report what each pass changed in one line each. No long summaries.
