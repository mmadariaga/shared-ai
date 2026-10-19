# ADR 0194: `/sai-3-implement-new` runs outside the shared orchestration

<!-- adr-index: amends 0188; refs 0163; refs 0187 -->

## Status

Accepted

## Context

Unattended `/sai-build` (`/sai-3-implement` then `/sai-4-apply`) kept stalling, and its recovery paths before a relaunch were expensive. The contracts it loads (`sai/orchestration/command-runner.md`, `sai/orchestration/worker-core.md`, `sai/policies/bounded-recovery.md`, the step-machine stop rules, and `sai/policies/unattended-runtime-recovery.md`) share four patterns. Each has its own literal that stops and asks the user. Each has closed enumerations that grow by one row per new edge case. Each restates that the plan never changes at runtime. Each pays round trips per stretch for handshakes and reconstruction. These are design properties repeated across files, not defects of one file.

The same contracts also serve commands that must stop and ask, such as `/sai-commit`, `/sai-merge`, and `/sai-archive`. So the fix cannot be to edit them for unattended behavior.

## Decision

1. **A separate `-new` family.** `/sai-3-implement-new` (a coordinator with RED and GREEN workers) and `/sai-build-new` (which chains it) are written from scratch. They load only the cross-cutting policies that never stop a run: public chat, `remember`, `safe-operations`, the prerequisite check, and tool resolution. They never load `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, or `composition.md`. Their worker bindings render from `standalone-worker-template.md`, which carries only the create and continue calls. The family coexists with `/sai-build`, `/sai-3-implement`, and `/sai-4-apply` and is meant to replace them later.
2. **Goals over enumerations.** The contracts state goals and completion criteria. A new edge case changes a goal's wording, never a table row.
3. **The plan is a plan.** The coordinator may edit any plan artifact (`proposal`, `specs`, `design`, `tasks`, `interfaces`), or override it in a worker's brief, whenever that is cheaper than obeying it. It records every difference as a deviation. The intent of `proposal.md` (its What and Why) is the boundary: changing it needs a human.
4. **One budget per obstacle, then escalate.** Each obstacle gets 3 attempts, and each attempt takes a different approach: a corrected instruction, a plan edit, an override, or a new worker. An exhausted budget escalates at once, with options the coordinator writes and one option that always stops the run. The answer resets that obstacle's counter. The escalation is not deferred to finish independent tasks first, because RED blocks GREEN inside a step and `tasks.md` declares no dependencies. Operations that need a human (a push, a deletion, a missing credential) escalate without spending an attempt.
5. **Workers live for the whole run** (amends ADR 0188, decision 3, for this family only). RED and GREEN are created once per run and continued step by step. The ready handshake of ADR 0188 runs only at creation, which includes a replacement worker, so it is paid once per worker and not once per step. RED stays blind to the GREEN body of its own step because it writes before GREEN in every step.
6. **State outside the context.** The `implement-new-run@1` machine holds identifiers and paths only, keyed by the change. Free text lives in files in the ignored `.tmp/{name}/run-*/` directory, and workers return the path of their report. The run closes with `openspec/changes/{name}/build-log.md` as the durable record for a later review.

## Alternatives Considered

- **Fork the shared contracts and propagate the copies everywhere.** Rejected. A trimmed copy keeps the structure of enumerations and stop literals, and several commands must keep stopping.
- **Keep the shared orchestration and relax its recovery.** Rejected. The per-stretch handshake and the replacement-reconstruction paths are the expensive ones.
- **Drop the ready handshake.** Rejected. On opencode the `task` call blocks, and its `task_id` arrives only when the subagent ends (ADR 0188). Live-per-role workers make the handshake cheap instead.
- **Finish independent tasks before escalating.** Rejected. Real independence is rare inside a slice, and a wrong guess builds on a broken base.

## Consequences

- The goal-based writing style can spread to other commands one by one, when each is rewritten. The `-new` contracts are not copied over the shared ones.
- The worker-report validator no longer gates the family's worker reports. The coordinator reads each report and asks again when it is unreadable.
- Tests and baselines that enumerate commands and workers count the family. Its bindings are the only ones that do not defer to `command-runner.md`.
