# Direct Build round

Fetch @sai/policies/finding-state.md
Fetch @sai/policies/question-context.md
Fetch @sai/policies/remember.md

The round is the whole user interaction of the Direct Build close: one group of
questions, one per report, asked at the end after every segment has finished
and the summary is printed. The coordinator owns the decision; the worker
receives only its result. Completion means one unambiguous selected set and
excluded set, plus the answers to Questions, have been resolved, or nothing was
selected and the caller closes without a fix.

## Qualifying reports

From the caller's `input`, take the reports in the fixed order `review.md`,
`security.md`, `performance.md`, `accessibility.md`. A report qualifies when it
has an open fixable finding or an open Question (`@sai/policies/finding-state.md`).
Plan entries, metrics, notes, and duplicate mentions are not findings. When no
report qualifies, there is no round: the caller's standard close runs.

## Show the findings

Before the round, show in chat for each qualifying report, in artifact order,
every open finding with its source-qualified id (for example `review:C1` or
`security:C1`), severity, title, brief problem/impact, and location. Ids repeat
across reports. Show each open Question in full, under its own heading, with the
reason it needs an answer. Keep the full statements for the worker; this
display only supports the decision. Explain that excluded findings and
unanswered Questions stay open in their reports and are not part of this fix or
commit.

## Ask the round

Ask one question per qualifying report, in the same order, under
`@sai/policies/question-context.md`. The summary question names the report and
its open counts. Each question offers three answers:

1. `Fix all fixable findings (Recommended)` — select every open fixable finding
   of the report; its Questions stay open.
2. `Fix nothing` — select nothing from the report.
3. The picker's built-in free-text response (`Other` on Claude Code,
   `Type your own answer` on opencode) — free text with the identifiers to
   exclude (`exclude: review:C1, review:L2`) and the answers to Questions, one
   per line (`review:Q1: <answer>`). It selects every open fixable finding
   except the excluded ones, and fixes each answered Question according to its
   answer. Name this third choice explicitly in the preceding text (for
   example, `Texto libre` in Spanish) and explain which built-in entry accepts
   it. Free text is the third answer here, not an invalid answer to a closed
   set.

Localize the visible wording to the user's language; keep ids literal.

On Claude Code the round is one `AskUserQuestion` call carrying every question.
On opencode it is the same questions in one `question` call when the picker
accepts several questions, and one call per question, consecutively and in the
same order, otherwise.

## Resolve the answers

Trim each id, match case-insensitively against that report's displayed
source-qualified ids, ignore repeats, and preserve report order. A Question is
fixed when the user answers it and stays open otherwise. An unknown or
unqualified id, an answer to a non-Question, or an exclusion of a Question
repeats only that report's question, once, after showing the valid ids; a
second invalid answer for that report ends the close: dispatch nothing, commit
nothing, and run `decline-close`.

Selected findings are the fixable findings kept plus the Questions answered,
each answered Question with the user's answer attached verbatim. Excluded
findings are the fixable findings excluded or left unselected plus the
unanswered Questions.

When every answer is `Fix nothing`, the picker is dismissed, or nothing is
selected, report that no fix or commit will run, dispatch nothing, and run
`decline-close`. Otherwise display the selected and excluded ids and return both
sets to the caller; choosing to fix anything authorizes the writes and a single
local commit.

When `direct-build-close.md` returns here after a **Scope conflict**, show the
worker's dependency explanation first, then ask the round again exactly as
above. The authorized scope is always the user's latest explicit answer.
