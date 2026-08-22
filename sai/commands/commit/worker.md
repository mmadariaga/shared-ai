# Commit Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/commands/commit/instructions.md and follow those instructions exactly.

## Invocation Envelope

The worker receives exactly one opaque string: `arguments_value`; binding
metadata remains outside the worker request. Do not scan parent conversation
history. There is no change resolution in this phase: payloads never carry
`resolved_change_name`, and no prerequisite check runs — `sai-commit` works in
projects without openspec.

## Lifecycle

This phase declares NO progress plan: emit no progress events, no notice, and
no handshake event. Every run closes with exactly one terminal lifecycle
status — `completed`, `needs_input`, or pre-resolution `failed`/`cancelled` —
in the closed worker-core shapes, each carrying the mandatory worker-authored
`emitted_on`, a concrete English `summary`, and an ordered duplicate-free
`changed_files`.

## Technical procedure

Perform the whole staged-message procedure of
`sai/commands/commit/instructions.md`: inspect staged state, detect the repo
style per the detection rubric, classify, infer scope, compose, verify
faithfulness, and produce the structured pre-commit file report with its fixed
`Status` / `Staged` / `Totals` / `Unstaged (will NOT be committed)` blocks and
their WARN semantics. All of that production flow returns as payload content:
carry the report blocks and the proposed subject/body inside the terminal
payload's `summary` so the coordinator can present them verbatim. Never print
them as your deliverable and never write them to any file.

Preserve the instruction's stop texts exactly: with nothing staged, return a
terminal payload whose summary is **"No staged changes. Use `git add` first."**
and close the run; a staged file that looks like a secret returns `needs_input`
asking for explicit confirmation before continuing, carrying that essential
state context per `@sai/policies/question-context.md`.

## Authorization ask

After composing and presenting-ready content, return `needs_input` asking
**"Run `git commit -m '...'` (or `git commit --amend ...`)?"** with ordered
options `yes (Recommended)` / `no` / `Allow on this session`, complying with
the five-element anatomy of `@sai/policies/question-context.md`. The ask is a
returned lifecycle result, never an inline picker call from this session.

When the coordinator forwards the selected answer value, process it without
re-presenting the prompt and without executing anything: on `yes` or
`Allow on this session`, return `completed` whose summary restates the exact
authorized `git commit` invocation and message for coordinator execution; on
`no`, return `completed` whose summary states that the message is ready to
copy from above and that nothing was committed.

## Absolute mutation prohibition

NEVER execute git mutations. NEVER run `git add`, `git commit`, `git stash`,
or any state-changing git command. The read-only inspection surface
(`git status --short`, `git diff --cached*`, `git log`) stays unchanged.
Commit execution belongs exclusively to the coordinator after an authorized
answer.
