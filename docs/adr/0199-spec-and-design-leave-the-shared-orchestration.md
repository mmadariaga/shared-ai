# ADR 0199: `/sai-1-spec` and `/sai-2-design` leave the shared orchestration and compose into `/sai-plan`

<!-- adr-index: amends 0194; refs 0187; refs 0188; refs 0189 -->

## Status

Accepted

## Context

ADR 0194 moved `/sai-3-implement` outside the shared orchestration because a trimmed copy of the Result Loop keeps the enumerations and stop literals that stall unattended runs. `/sai-build` composes implement and review without `composition.md` (ADR 0187), and it already runs goal-driven and unattended.

The Plan route of `/sai-explore` had no such command. It restated the shared Result Loop in a 148-line, 51 KB step and spread failure handling over four sources: the step itself, `bounded-recovery.md`, `unattended-runtime-recovery.md`, and the Plan state of `pipeline-selector.md`. The standalone `/sai-1-spec` and `/sai-2-design` were interactive: they presented the artifact feedback gate and asked mid-run questions that the Ready to Propose block usually answers.

## Decision

1. **`/sai-1-spec` and `/sai-2-design` are rewritten from scratch as always-unattended, goal-driven coordinators.** They load only `public-chat`, `remember`, `safe-operations`, `tool-resolution`, the budget skill, and their own shared cycle (`sai/commands/plan/cycle.md`). They load none of `command-runner`, `worker-core`, `bounded-recovery`, `stop-options`, `unattended-runtime-recovery`, `no-commit-guard`, `composition`, or `artifact-feedback-gate`. There is no interactive mode.
2. **`/sai-plan` composes them like `/sai-build` composes implement and review.** It follows the spec coordinator and then the design coordinator as segments, in one session, with the artifacts on disk as the only interface between them. When the proposal and specs already exist, the disk wins and the spec segment counts as done.
3. **The workers keep their names and become standalone workers.** `sai-1-spec-proposal-worker` and `sai-2-design-worker` keep their manifest, worker-matrix, and preset keys, render their bindings from the standalone template, and write a report file whose path they return. Their step libraries are delivered by pointer through two new linear machines, `spec-steps@1` and `design-steps@1`. The overview leaves the machine and becomes a continuation that the coordinator sends only when `--overview-lang` is set.
4. **The coordinator answers worker questions and reviews.** A question that the block, the artifacts, or the repository answers is answered and recorded as an assumption with its source; a question that none of them answers and whose answer would change the artifacts is escalated through the native picker. Review is the coordinator's own, in up to three incremental rounds over the segment's artifacts, instead of a fresh reviewer worker. Findings left after the third round are pending and do not stop the run. Mechanical checks (`openspec validate`, `check-delta-headers.js`, `check-cited-paths.js`, and in design `file-manifest.js verify`) are obstacles with a budget of three attempts, not findings.
5. **One local commit per segment, state in `plan-run@1`.** Each segment commits only its own non-ignored paths. The run state is a new machine on the shared run core (`run-core.js`), with the segments `spec` and `design`, the session key `plan-{name}`, and a run directory under the SAI temp root. Assumptions and pending findings live in that directory and in the closing report only.
6. **The Plan route of `/sai-explore` follows `/sai-plan`.** `pipeline-plan-unattended.md` becomes a thin step that exports the first pending slice's block, follows `plan/coordinator.md`, and emits the slice-machine intents. The Plan-only state (`active_phase`, `specs_converged_changes`, `auto_answered`, `escalated_count`, `review_rounds`, the `spec` and `design` diagnosis counters) and the Plan Diagnosis Round are retired, together with `artifact-feedback-gate.md`, `spec-phase-contract.md`, `design/phase-contract.md`, `spec-standalone@1`, `design-standalone@1`, and the `--with-overview` option of `sai-state`. Direct Build, archive, backfill, commit, merge, the audits, and the manual `review-loop` keep every surface they use.
7. **`--fast-track` and `--supervised` are accepted and ignored by the three commands.** `/sai-2-design` is no longer a member of the fast-track parser, because nothing it asked is left to skip.

## Alternatives Considered

- **Rewrite only the explore route over the current spec and design workers.** Smaller, but two styles remain.
- **Rewrite the commands and let explore chain them without `/sai-plan`.** One command fewer, but the chaining logic stays inside explore.
- **Keep an interactive mode for standalone invocations.** Every command would need two modes.
- **A fresh reviewer worker per phase.** More independent, and more expensive; plan errors surface in the next segment, and `/sai-build` already reviews the final code in a fresh worker.
- **No commits, as today.** Resume would depend only on disk and the store.
- **Persist assumptions in the artifacts.** Survives across sessions, but changes the schema templates.

## Consequences

- Standalone `/sai-1-spec` and `/sai-2-design` lose mid-run questions; the user reviews at the closing report and refines with feedback.
- Pending review findings do not stop the run, so design can start on specs with known holes.
- Assumptions do not survive outside the closing report.
- Explore follows the plan coordinator in its own session, so it writes the run directory through the budget executor and gains no direct write tool.
- ADR 0194 and ADR 0187 keep their history; this decision extends the same pattern to the plan family.
