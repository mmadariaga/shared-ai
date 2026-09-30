# security-step-gated-delivery Specification

## Purpose
TBD - created by syncing change audit-step-gated-instructions. Update Purpose after archive.

## Requirements

### Requirement: Security Audit Carved Step Library

The security command SHALL deliver its audit instruction mass through a
carved `sai/commands/security/steps/` library — `common.md` plus one file
per non-fileless plan step (`discover-module-map`, `resolve-sast-analysis`,
`resolve-sca`, `close-security-outcome`) — while the original monolithic
`instructions.md` remains in place untouched beside it.

#### Scenario: Step files name their active step

- **WHEN** any file under `sai/commands/security/steps/` other than `common.md` is read
- **THEN** it names exactly its own active step id in an `Active step:` declaration

### Requirement: Security Coordinator Pointer Continuations

The security coordinator SHALL send every progress-event continuation as exactly two lines whose second line is the deterministic `Active step:` pointer derived from the step machine per `@sai/policies/stage-machine.md` § Step machines. It SHALL open the post-ready task disclosure with the `discover-module-map` pointer returned by the segment-start `reset`, per `@sai/orchestration/command-runner.md` § Step-gated pointer delivery. It SHALL carry no pointer line on any other continuation that is not a progress-event continuation. Replacement reconstruction fields SHALL include `active_step_id`, which is `discover-module-map` before the first progress event.

#### Scenario: Non-progress continuation keeps the active step

- **WHEN** a picker answer is forwarded as a non-progress continuation
- **THEN** the payload carries no pointer line and the worker retains its previously named active step

### Requirement: Security Worker Active Step Execution

The security worker SHALL load `steps/common.md` at dispatch as part of its sealed initial surface. It SHALL run the fileless `resolve-security-scope` from that surface before following the first pointer, which arrives as the first line of the task-disclosure continuation before `arguments_value`. It SHALL execute ONLY the step named by the most recent `Active step:` pointer line, never prefetching, opening, or following any other step instruction file. It SHALL report `resolve-security-scope` and `discover-module-map` together in its first progress event. A legitimately skipped gated stage SHALL still report its milestone and advance past its step without executing the step file.

#### Scenario: Gated SCA skip advances the pointer

- **WHEN** no dependency manifest changed in the diff and the SCA gate resolves as legitimately skipped
- **THEN** the worker reports the `resolve-sca` milestone completed and the next delivered pointer names the following step without `resolve-sca.md` executing
