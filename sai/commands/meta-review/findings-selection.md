# Direct Build findings selection

Fetch @sai/policies/question-context.md
Fetch @sai/policies/remember.md

This step runs only after the user selects `direct-label` in
`direct-build-close.md`, before any fix-worker dispatch. The coordinator owns
the decision; the worker receives only its result. Completion means one
unambiguous selected set and excluded set have been shown to the user, or all
eligible findings were excluded and the caller closes without a fix.

## Show the findings

From the caller's `input`, enumerate issues in artifact order (`review.md`,
`security.md`, `performance.md`, `accessibility.md`) and report order. Show
**every found issue** with its source-qualified id (for example `review:C1` or
`security:C1`), severity, title, brief problem/impact, and location. Ids can
repeat across reports; mutation findings retain their report id. Show Questions
(`Q*`) and findings requiring a requirement/design change separately with the
reason they are not eligible for Direct Build. Plan entries, metrics, notes,
and duplicate mentions are not additional issues. Keep the full selected
finding statements for the worker; this display only supports the decision.

Explain that excluded findings stay in their reports, remain unresolved, and
are not part of this fix or commit. Present the question and context under
`@sai/policies/question-context.md`, then use the native picker:

1. `Fix all findings (Recommended)` — select every eligible finding.
2. `Specify findings to exclude` — ask one open-ended question for
   comma-separated source-qualified ids (or `all` to exclude all).
3. The picker's built-in free-text response (`Other` on Claude Code,
   `Type your own answer` on opencode) — treat the submitted text as the
   exclusion list **immediately**, without a second question. Do not add a
   third clickable option that cannot carry the text in the same response.

In the preceding text, name the third choice explicitly (for example,
`Texto libre` in Spanish) and explain which built-in picker entry accepts it.
Localize the visible option wording to the user's language; keep ids literal.
Free text is the third choice here, not an invalid answer to a closed set.

## Resolve the choice

For either exclusion path, trim each comma-separated id, match
case-insensitively against the displayed source-qualified ids, ignore repeats,
and preserve the original report order. Accept `all` only by itself. For an
empty, unknown, ambiguous, or unqualified id, show the valid ids and ask again
for the exclusion list; dispatch nothing. If every eligible finding is
excluded, report that no fix or commit will run and return an empty selected
set to the caller. Otherwise display the selected and excluded ids and return
both sets to the caller.

When `direct-build-close.md` returns here after a **Scope conflict**, show the
worker's dependency explanation first, then ask again exactly as above. The
authorized scope is always the user's latest explicit selection.
