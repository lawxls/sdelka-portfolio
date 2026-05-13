# ISSUES

Issues JSON is provided at start of context. Parse it to get open issues with their bodies and comments.

You've also been passed the last 10 RALPH commits (SHA, date, full message). Review these to understand what work has been done.

# TASK SELECTION

Pick the next task from the provided issues JSON ONLY. Do NOT look for or work on any other issues outside of what was provided. Prioritize tasks in this order:

1. Critical bugfixes
2. Tracer bullets for new features

Tracer bullets comes from the Pragmatic Programmer. When building systems, you want to write code that gets you feedback as quickly as possible. Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential issues and ensures that the overall architecture is sound before investing significant time in development.

TL;DR - build a tiny, end-to-end slice of the feature first, then expand it out.

3. Polish and quick wins
4. Refactors

If every issue in the provided list has already been completed (closed in a previous iteration or no remaining work), output `<promise>COMPLETE</promise>`. Do NOT output this after completing your single task — only when there is genuinely nothing left to do across all provided issues.

# EXPLORATION

Explore the repo and fill your context window with relevant information that will allow you to complete the task.

# EXECUTION

Complete the task.

# COMMIT

Make a git commit. The commit message must:

1. Start with `RALPH:` prefix
2. Include task completed + PRD reference
3. Key decisions made
4. Files changed
5. Blockers or notes for next iteration

Keep it concise.

# THE ISSUE

Leave a comment on the GitHub issue summarizing what was done in this iteration. Do NOT close the issue — the PR merge will close it via the `Closes #N` reference in the final PR body.

# DO NOT

- Do NOT `git push` the branch.
- Do NOT run `gh pr create` or `gh pr edit`.
- Do NOT close GitHub issues.

The orchestrator pushes and opens ONE PR after every iteration of the loop finishes. Your output ends at the local commit + issue comment.

# FINAL RULES

- ONLY WORK ON A SINGLE TASK.
- End your turn with `<promise>ITERATION_DONE</promise>` after committing the slice, or `<promise>COMPLETE</promise>` only when every provided issue is genuinely done across the full run.
