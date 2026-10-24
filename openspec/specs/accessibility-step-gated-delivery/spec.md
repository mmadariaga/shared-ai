# accessibility-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Accessibility Audit Carved Step Library

The accessibility command SHALL deliver its audit instruction mass through
a carved `sai/commands/accessibility/steps/` library — `common.md` plus one
file per non-fileless plan step (`map-ui-framework`,
`resolve-static-audit`, `resolve-runtime-audit`,
`close-accessibility-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/accessibility/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Accessibility Coordinator Pointer Continuations

The accessibility coordinator SHALL send every progress-event continuation as exactly two lines whose second line is the deterministic `Active step:` pointer derived from the step machine per `@sai/policies/stage-machine.md` § Step machines. The coordinator SHALL deliver the terminal `Active step: none` line once the plan is fully marked. It SHALL open the post-ready task disclosure with the `map-ui-framework` pointer returned by the segment-start `reset`, per `@sai/orchestration/command-runner.md` § Step-gated pointer delivery. It SHALL carry no pointer line on any other continuation that is not a progress-event continuation. Replacement reconstruction fields SHALL include `active_step_id`, which is `map-ui-framework` before the first progress event.

#### Scenario: All-marked plan delivers the terminal pointer

- **WHEN** a progress event marks the last unmarked plan step
- **THEN** the next continuation's pointer line reads `Active step: none — complete remaining work and return your terminal result.`

#### Scenario: Non-progress continuation keeps the active step

- **WHEN** a picker answer is forwarded as a non-progress continuation
- **THEN** the payload carries no pointer line and the worker retains its previously named active step

#### Scenario: Replacement reconstruction restores the active step

- **WHEN** a departing accessibility worker is replaced mid-run
- **THEN** the replacement reconstruction fields include the departed worker's `active_step_id` and the replacement re-resolves its active step from the surviving machine state without re-emitting

### Requirement: Accessibility Worker Active Step Execution

The accessibility worker SHALL load `sai/commands/audit/worker-common.md` and `steps/common.md` at creation as its initial surface. It SHALL run the fileless `resolve-accessibility-scope` step from the brief and that surface before following the first pointer, which arrives as the first line of the task message before the brief. It SHALL execute ONLY the step named by the most recent `Active step:` pointer line, never prefetching, opening, or following any other step instruction file; a message without a pointer line SHALL leave the active step unchanged. It SHALL report `resolve-accessibility-scope` and `map-ui-framework` together in its first `step-done` batch. A runtime-audit stage that does not apply (no `--runtime`, or no UI file in scope) SHALL be reported in the batch of the step that decided the skip, so the next pointer lands on the step that still has work.

#### Scenario: Runtime gate skip advances the pointer

- **WHEN** the run has no `--runtime` and the static audit completes
- **THEN** the worker reports `resolve-runtime-audit` in the `resolve-static-audit` `step-done` batch and the next delivered pointer names `close-accessibility-outcome`
