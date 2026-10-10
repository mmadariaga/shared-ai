# Review Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/review/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string, `arguments_value`, and reads nothing from parent conversation history. Parse it per `options.md`: an optional change name, then the declared options. The first token that does not start with `--` and is not an option's value is the change name; a leading `--` token means no name was supplied. An unknown `--` option, a second positional value, or an option missing its value returns `failed` before any resolution, naming the token (a second positional value is answered with: the parent branch is passed as `--parent-branch <branch>`).

## Change Resolution and Proposal Gate

1. **Resolve the change.** Use the supplied name. Without one, run `openspec list --json`:
   - zero changes — return `failed` with exactly: "No active changes found. Run `/sai-1-spec` to create one."
   - one change — ask `Use change '{name}'?` with ordered options `yes`, `no`; `yes` resolves it and `no` returns `cancelled`.
   - several — ask `Which change?` with the changes as options in CLI order; after invalid input ask again, with no retry cap.
2. **Gate on `proposal.md`.** When it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`

A missing `proposal.md` ends the run before any review analysis or durable write. Every payload after resolution includes `resolved_change_name`; no payload carries artifact contents.

## Progress Reporting

Report the coordinator's four-step plan as progress events, each id once, in plan order, per `@sai/orchestration/worker-core.md` § Nonterminal Result Transport. The complete path returns three progress events, the first carrying the first two ids:

- `resolve-change` — the startup act (change resolution and the proposal gate above) passes. It must pass before dispatching any `budget-explorer`, computing the diff, or beginning a review pass, and it reports together with `establish-diff-scope` in the first progress event, per `@sai/orchestration/worker-core.md` § Step-machine task disclosure.
- `establish-diff-scope` — the diff scope is established. An empty diff reports it before returning `cancelled`.
- `resolve-review-analysis` — passes 1–11 are done.
- `close-review-outcome` — `review.md` is written and verified.

Each event's `changed_files` lists every path written since the preceding result. Progress events start only after resolution, never replace a terminal payload, and never arrive during a `needs_input` pause; the run always closes with exactly one terminal lifecycle status.

## Active Step Execution

Instructions arrive just-in-time, one step file at a time. Each progress continuation carries one pointer line, `Active step: <id> — follow <path>`: execute only the step it names, following that file exactly. Step paths arrive only through those pointer lines; this contract plus common.md is the sealed initial surface. `resolve-change` runs from it before the first progress event, and the first delivered pointer targets `establish-diff-scope`. A continuation without a pointer line (a picker answer) leaves the active step unchanged. Steps never widen the lifecycle, progress, changed-files, or failure rules.

## Review Work

Write only `openspec/changes/{change-name}/review.md`; `changed_files` holds only that report path.

Return `needs_input` for picker questions, `cancelled` for a deliberate decline or an empty diff, and `failed` for blockers.

The close step verifies the report before `completed` and composes the `completed` summary.
