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

Follow the staged-message procedure of `sai/commands/commit/instructions.md` Steps 1–6 (worker-owned):

1. **Step 1: Collect** — call `node sai/tools/commit.js collect --json --cwd <repo>` and read the JSON output. This is read-only and does not violate the mutation prohibition.
2. **Step 2-5: Draft** — classify the change, infer scope, compose message, verify faithfulness.
3. **Step 6: Present** — show files, message, and ask for authorization via `needs_input`.

Do **not** perform Step 7 (Execute Commit). That belongs exclusively to the coordinator after an authorized answer.

Preserve the instruction's stop texts exactly:
- With nothing staged (collect returns exit code 1), return a terminal payload whose summary is **"No staged changes. Use `git add` first."**

## Authorization ask

After composing and presenting-ready content, return `needs_input` asking
**"Run `git commit`?"** with ordered options `yes (Recommended)` / `no` / `Allow on this session`, complying with the five-element anatomy of `@sai/policies/question-context.md`. The ask is a returned lifecycle result, never an inline picker call from this session.

When the coordinator forwards the selected answer value, process it without
re-presenting the prompt and without executing anything: on `yes` or
`Allow on this session`, return `completed` whose summary restates the exact
authorized message for coordinator execution; on `no`, return `completed` whose summary states that the message is ready to copy from above and that nothing was committed.

## Absolute mutation prohibition

NEVER execute git mutations. NEVER run `git add`, `git commit`, `git stash`,
or any state-changing git command. The read-only inspection surface
(`git status --short`, `git diff --cached*`, `git log`) stays unchanged.
Commit execution belongs exclusively to the coordinator after an authorized
answer.
