---
name: ship-plan
description: Turn the current conversation context into a PRD, then break it into independently-grabbable implementation issues. Use when the user wants to go from idea to actionable tickets in one shot.
---

Run two skills back-to-back without pausing for confirmation between them.

1. Invoke the `to-prd` skill. It synthesizes the current conversation into a PRD and publishes it as a GitHub issue (or as a `.md` document only if the user explicitly asked).

2. Once the PRD is published, invoke the `to-issues` skill against that PRD. It slices the work into tracer-bullet vertical-slice issues on the project tracker.

Notes:

- Do not re-interview the user between steps — both downstream skills synthesize from existing context.
- Pass the published PRD (issue URL or `.md` path) as the input to `to-issues`.
- If the user explicitly asked for a `.md` PRD, still proceed to `to-issues` afterward unless they say otherwise.
