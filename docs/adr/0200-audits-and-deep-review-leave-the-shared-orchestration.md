# ADR 0200: The audits and `/sai-deep-review` leave the shared orchestration, and `composition.md` retires

<!-- adr-index: supersedes 0187; refs 0107b; refs 0194; refs 0199 -->

## Status

Accepted

Supersedes [ADR 0187](./0187-composition-rules-live-in-their-own-orchestration-file.md).

## Context

ADR 0187 moved the chained-composition rules out of `command-runner.md` into `sai/orchestration/composition.md`, loaded only by composition coordinators. ADR 0194 and ADR 0199 then moved `/sai-3-implement`, `/sai-4-review`, `/sai-build`, `/sai-1-spec`, `/sai-2-design`, and `/sai-plan` outside the shared orchestration, because a trimmed copy of the Result Loop keeps the enumerations and stop literals that stall unattended runs.

`/sai-5-security`, `/sai-6-performance`, and `/sai-7-accessibility` have since been rewritten on one goal-driven, unattended coordinator, `sai/commands/audit/coordinator.md`, written as a cycle per worker. `/sai-deep-review` was the last command that loaded `composition.md`: it composed the three former audit coordinators as phase adapters on the `*-standalone@1` machines, and it asked one selection question per report before fixing. `/sai-build` already runs unattended and replaces that human selection with an Assessment pass.

## Decision

1. **`/sai-deep-review` is rewritten in the shape of `/sai-build`.** Its single card, `sai/commands/deep-review/coordinator.md`, follows the review coordinator, parses the bounded triage of `review.md`, runs the activated audits, runs the Assessment pass, and follows the implement coordinator as the fix segment. There is no human findings selection and no findings round. The wrapper loads the harness fetch skill and the coordinator, with no boot adapter and no bootstrap. The coordinator loads only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, and `finding-state`.
2. **The audits run as parallel cycles of the shared audit coordinator.** The coordinator holds no state outside its own `sai-state` session (key `{audit}-{name}`), so `/sai-deep-review` creates the activated workers in one batch and drives one cycle per worker. The driving session issues every `sai-state` call and every commit one at a time, in the fixed order security, performance, accessibility, and commits each verified report alone. The accessibility dev-server URL is asked once, between the triage and the audit batch, so no question pauses the parallel audits. An audit that fails or exhausts its budget does not close the run; its findings never enter the Assessment pass.
3. **A rerun regenerates the reports.** An interrupted `/sai-deep-review` reruns the review and the activated audits and runs the Assessment pass again, as `/sai-build` does; only the fix segment resumes, through `/sai-3-implement`'s own Resuming rule. Reusing the committed reports would pair audit reports with a `review.md` of a different review.
4. **`composition.md` retires.** Its only loader is gone, so the file, its install projection, and the pointer to it in `command-runner.md` are removed, together with `sai/commands/deep-review/findings-selection.md`, the per-audit `coordinator.md` and `command-bootstrap.md` cards, and the `security-standalone@1`, `performance-standalone@1`, and `accessibility-standalone@1` machines. Each retired file gets a retirement entry in the install manifest. `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, and `bounded-dispatch-retry` stay for the commands that still load them.
5. **ADR 0107b stays in force unchanged.** The audits keep its unified severity vocabulary.

## Alternatives Considered

- **Reuse committed `review.md` and audit reports on a rerun.** Faster, but a report could belong to an older review than the regenerated `review.md`.
- **Keep `composition.md` for a future composition.** It would stay unloaded, so its rules would drift without a test that exercises them.
- **Keep the findings round and add an unattended switch.** Two modes in one command, and the round is the interaction the command exists to remove.

## Consequences

- `/sai-deep-review` asks nothing between its start and its close, apart from the accessibility URL input and an escalation of the review or fix segment.
- An interrupted run repeats the review and the audits on rerun, trading time for consistent reports.
- Questions stay open for the user: the fix segment applies only fixable findings, and the user answers a Question by editing the change and running `/sai-3-implement`.
- The Assessment pass writes ` (EXCLUDED: <reason>)` marks with a reason the user can reverse by removing the mark and running `/sai-3-implement {name}`.
- ADR 0187 and ADR 0147a keep their history; the rules they describe no longer exist as a file.
