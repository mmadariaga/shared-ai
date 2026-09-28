# Review Worker

Fetch @sai/policies/verified-precondition-handback.md
Fetch @sai/orchestration/worker-core.md and follow it exactly.
Fetch @sai/policies/bounded-dispatch-retry.md and follow it for every delegated subagent dispatch.
Fetch @sai/commands/review/steps/common.md and keep it in force for the entire run.

## Invocation Envelope

The worker receives exactly one opaque string, `arguments_value`, and reads nothing from parent conversation history. Parse it as at most two positional values: change name, then optional parent branch.

## Prerequisites and Resolution

1. **Resolve the change.** Use the supplied name. Without one, run `openspec list --json`:
   - zero changes — return `failed` with exactly: "No active changes found. Run `/sai-1-spec` to create one."
   - one change — ask `Use change '{name}'?` with ordered options `yes`, `no`; `yes` resolves it and `no` returns `cancelled`.
   - several — ask `Which change?` with the changes as options in CLI order; after invalid input ask again, with no retry cap.
2. **Check prerequisites.** Fetch @sai/policies/prereqs.md and run its check tool. On a halt or an incomplete check, return `failed` carrying exactly what that policy prints.
3. **Gate on `proposal.md`.** When it is missing, return `failed` with exactly `openspec/changes/{change-name}/proposal.md not found. Ensure the change name is correct and that /sai-1-spec has been run for this change.`

A prerequisite failure ends the run before any review analysis, mutation, or durable write. Every payload after resolution includes `resolved_change_name`; no payload carries artifact contents.

## Progress Reporting

Report the coordinator's five-step plan as progress events, each id once, in plan order, per `@sai/orchestration/worker-core.md` § Nonterminal Result Transport:

- `resolve-change` — the startup act (the three steps above) passes. This is the Startup Handshake: return it before dispatching any `budget-explorer`, computing the diff, or beginning a review pass.
- `establish-diff-scope` — the diff scope is established. An empty diff reports it before returning `cancelled`.
- `resolve-review-analysis` — passes 1–11 are done.
- `resolve-mutation-analysis` — the Pass 12 activation gate is resolved, whether the mutation path runs or is legitimately skipped.
- `close-review-outcome` — `review.md` is written and verified.

Each event's `changed_files` lists every path written since the preceding result. Progress events start only after resolution, never replace a terminal payload, and never arrive during a `needs_input` pause; the run always closes with exactly one terminal lifecycle status.

## Active Step Execution

Instructions arrive just-in-time, one step file at a time. Each progress continuation carries one pointer line, `Active step: <id> — follow <path>`: execute only the step it names, following that file exactly, and never prefetch, open, or follow any other step instruction file. Step paths arrive only through those pointer lines; this contract plus common.md is the sealed initial surface. `resolve-change` runs from it before the first progress event, and the first delivered pointer targets `establish-diff-scope`. A gated stage resolved by legitimate skip still reports its milestone, and the next delivered pointer advances past it without that step file executing. A continuation without a pointer line (a picker answer) leaves the active step unchanged. Steps never widen the lifecycle, progress, changed-files, or failure rules.

## Review Work

Write only `openspec/changes/{change-name}/review.md`; Pass 12's engine applies and reverts its own temporary mutations. `changed_files` holds `review.md` plus any production file whose revert failed or whose mutation outcome is unaccounted; cleanly reverted targets stay out.

Return `needs_input` for picker questions, `cancelled` for a deliberate decline or an empty diff, and `failed` for blockers.

Before returning `completed`, verify that `review.md` exists, is non-empty, and contains:

- a severity-prefixed identifier (`C1`/`H1`/`M1`/`L1`/`Q1`) on every finding, when there are any;
- the severity roll-up, coverage notes, and Pass 12 outcomes;
- all three audit recommendations;
- a closing `Summary:` tally line whose counts match the report's findings, with mutation findings folded in at their remapped severities.

The close step composes the `completed` summary.
