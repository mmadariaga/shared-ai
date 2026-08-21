# apply-routed-card-set Specification

## Purpose

Defines the routed card set for `/sai-4-apply` — coordinator.md + runner.md + invocation.md + worker contracts under `sai/commands/apply/`, with runner.md extracted from the current monolithic instructions.md — so apply gains the same routed shape as the other seven numbered commands.

## Requirements

### Requirement: apply-terminal-lifecycle-contract-coverage

The repository SHALL contain focused contract tests for the active routed apply source that assert the coordinator-owned terminal lifecycle is present in `sai/commands/apply/runner.md`: Final sweep, exactly one learnings promotion pass, terminal documentation-set evaluation, visibility disclosure, authorization/commit behavior, and MANDATORY STOP in that order. The tests SHALL cover the no-op path, decline path, active session-flag and `--fast-track` paths, and the boundary that halts before the Final sweep.

The tests SHALL protect the routed source as the authority and SHALL fail if the behavior is moved only into the retired monolithic `sai/commands/apply/instructions.md` or omitted from the active card set.

#### Scenario: Routed runner loses the terminal lifecycle

- **WHEN** a future edit removes promotion, terminal evaluation, or terminal navigation ordering from `runner.md`
- **THEN** the contract suite fails with a focused assertion identifying the missing routed lifecycle behavior

#### Scenario: Halt and no-op semantics regress

- **WHEN** a future edit allows promotion before the Final sweep, proposes a terminal gate for an empty set, or retries after a decline
- **THEN** the contract suite fails the corresponding halted-run, no-op, or decline assertion

### Requirement: apply-terminal-path-contract-coverage

The contract tests SHALL assert that terminal path selection is explicit and closed: changed `docs/**`, root `SAI_LEARNINGS.md` only when written by the current promotion pass, and changed root `GLOSSARY.md` are eligible; `openspec/changes/**`, `implementation.md`, and unrelated working-tree paths are excluded; and `git add -A` or an equivalent broad staging fallback is forbidden. The tests SHALL also assert that the terminal visibility listing occurs before the proposed commit message and authorization.

The tests SHALL keep the terminal set distinct from the coordinator's changed-files union and from ordinary per-Step field-8 staging.

#### Scenario: Terminal path boundaries regress

- **WHEN** a future edit widens staging to OpenSpec artifacts, unrelated paths, or a broad working-tree sweep
- **THEN** the contract suite fails the exact path-boundary assertion

#### Scenario: Preview ordering regresses

- **WHEN** a future edit stages before visibility disclosure or asks for authorization before the proposed message
- **THEN** the contract suite fails the terminal preview-order assertion

### Requirement: apply-harness-parity-contract-coverage

The contract suite SHALL verify parity across Claude Code and opencode for the routed apply source: both boot adapters select `sai/commands/apply/coordinator.md`, both use the shared runner contract, and neither RED nor GREEN worker contract grants Git commit authority. The parity assertions SHALL not introduce harness-specific terminal behavior.

#### Scenario: One harness bypasses the routed coordinator

- **WHEN** either supported harness boot adapter selects a retired apply body or a harness-specific terminal implementation
- **THEN** the contract suite fails the parity assertion

#### Scenario: A worker gains commit authority

- **WHEN** a RED or GREEN worker contract loses its Git prohibition or gains staging/commit instructions
- **THEN** the contract suite fails the worker-boundary assertion

### Requirement: apply-card-set-is-routed

The `sai/commands/apply/` folder SHALL contain the routed card set: `coordinator.md`, `runner.md`, `invocation.md`, and the RED and GREEN worker contracts. The utility `body.md` surface SHALL be retired and SHALL NOT be selected by any boot adapter. The active `runner.md` SHALL carry the Step loop contract — dispatch routing, coordinator verification, scratch sweeps, human gates, checkbox marking, appendices, pre-commit report, STOP & COMMIT checklist, learnings memory, the once-per-run learnings promotion, terminal documentation commit, and final sweep. The retired monolithic `instructions.md` SHALL NOT be required as an executable authority for these operations.

#### Scenario: apply folder holds the routed surfaces

- **WHEN** the routed card set is implemented
- **THEN** `sai/commands/apply/` contains `coordinator.md`, `runner.md`, `invocation.md`, and the RED/GREEN worker contracts
- **AND** `body.md` no longer exists in the apply folder

#### Scenario: runner.md carries the complete loop contract

- **WHEN** a maintainer reads `sai/commands/apply/runner.md` after this change lands
- **THEN** it contains the Step loop, promotion pass, terminal documentation-set evaluation, terminal visibility, authorization, commit boundaries, final sweep, and terminal navigation contracts

#### Scenario: boot adapter never selects apply body.md

- **WHEN** either harness boot adapter selects the apply card
- **THEN** it selects `@sai/commands/apply/coordinator.md`, never a body card

### Requirement: apply-coordinator-declares-adapter-fields

The apply coordinator SHALL declare the phase-adapter fields per `@sai/orchestration/command-runner.md`: `original_envelope` (the single `arguments_value` request), `dispatch_operation` (the active apply worker binding dispatch for the current dispatch kind), `continuation_operation` (the active binding's same-worker continuation), `allowed_nonterminal_extensions` (progress events as the sole nonterminal extension), `extension_handlers`, `replacement_reconstruction_fields`, `terminal_navigation` (apply completion, STOP, or unsuccessful-stop behavior), and the static `recovery_policy: true` (opting into the shared bounded same-worker recovery pool of exactly three attempts per `apply-same-worker-retry`). The coordinator SHALL validate every worker result against the closed lifecycle payloads and keep an invocation-scoped ordered duplicate-free `changed_files` union.

The apply runner deviates from the neutral single-dispatch rule by design: `sai/orchestration/command-runner.md`'s result loop mandates "dispatch one worker" per invocation with at most one replacement, while apply's `runner.md` dispatches one worker per Step dispatch (and a RED→GREEN pair per split Step) across the run, with up to 3 same-worker retries per Step. The `runner.md` loop contract SHALL document this carve-out explicitly: each Step dispatch is a fresh worker dispatch carrying its own envelope, each dispatch result is validated through the closed lifecycle payloads, the `changed_files` union is invocation-scoped across all dispatches, and same-worker continuation precedes any replacement. The neutral `sai/orchestration/command-runner.md` SHALL NOT be amended; the single-dispatch rule stays for the worker-centric phases and `runner.md` owns the apply exception.

#### Scenario: coordinator supplies the adapter fields

- **WHEN** `/sai-4-apply` starts under the routed architecture
- **THEN** the apply coordinator declares the command-runner adapter fields and validates every worker payload against the closed lifecycle statuses

#### Scenario: runner documents the multi-dispatch carve-out

- **WHEN** `sai/commands/apply/runner.md` is read after this change lands
- **THEN** it states explicitly that apply dispatches one worker per Step dispatch (plus the RED→GREEN pair per split Step) and up to 3 same-worker retries per Step, overriding the neutral single-dispatch rule for apply, while `sai/orchestration/command-runner.md` itself remains unamended

#### Scenario: each dispatch is validated through the closed payloads

- **WHEN** a Step dispatch returns a result
- **THEN** the coordinator validates it against the closed lifecycle payloads, unions its `changed_files`, and continues per the runner loop — per dispatch, not per invocation

#### Scenario: changed_files union accumulates across dispatches

- **WHEN** workers return results across dispatches and retries
- **THEN** the coordinator adds every `changed_files` path once in first-seen order and never resets the union during the run

### Requirement: Timestamped apply progress validation

The apply adapter SHALL validate `emitted_on` in every RED, GREEN, and green-exception progress event while preserving each immutable dispatch-local plan, ordered union, and same-worker continuation.

#### Scenario: Apply dispatch reports progress
- **WHEN** a dispatched apply worker returns a progress event
- **THEN** the coordinator validates its timestamp, marks declared ids, unions paths, and continues the same worker.

### Requirement: apply-invocation-core-preserves-loading

The apply `invocation.md` SHALL preserve the utility body's loading behavior: the change picker, the prerequisite checks (including the `implementation.md` existence check), the fast-track parse of `$ARGUMENTS`, the `budget` skill, the `safe-operations` skill, the `sai-learnings-format` policy, the runner.md loop contract, and the `remember` policy. The invocation core SHALL be shared by both harnesses and SHALL NOT re-implement coordinator lifecycle mechanics.

#### Scenario: invocation core loads the phase content

- **WHEN** the apply coordinator dispatches or loads the invocation core
- **THEN** the core loads the change picker, prerequisites, fast-track parse, budget and safe-operations skills, learnings format, runner contract, and remember policy

#### Scenario: fast-track parse survives the re-architecture

- **WHEN** `--fast-track` appears in `$ARGUMENTS`
- **THEN** the routed card set parses it in the shared invocation/coordinator surface (not the wrappers), prints the exact `> FAST-TRACK MODE ACTIVE` line, and behaves identically across Claude Code and opencode

### Requirement: apply-mandatory-stop-preserved

The routed apply run SHALL close with the same MANDATORY STOP semantics as the utility card: the coordinator prints exactly `Implementation applied. Run \`/sai-5-review {name}\` in a new chat when ready.` only when every Step is applied, every human gate reviewed, and every commit done. A run halted early SHALL NOT print the completion message.

#### Scenario: completed run prints the stop literal

- **WHEN** all Steps are applied, all human gates reviewed, and all commits done
- **THEN** the coordinator prints the exact completion literal and stops

#### Scenario: halted run prints no completion message

- **WHEN** the run halts before the final sweep (GREEN-conflict halt, user stop, or declined commit gate)
- **THEN** the coordinator does not print the completion literal and does not claim completion

### Requirement: apply-progress-plan-declared

The apply phase adapter SHALL declare a progress plan per the shared progress-plan contract, distinct from the run-start step projection. The plan is per-dispatch: before each Step dispatch the coordinator SHALL declare the static ordered milestone steps that the dispatched worker will mark — a RED dispatch's `test-authoring` then `red-verification`; a GREEN dispatch's `implementation` then `green-verification`; a green-exception RED dispatch's `test-authoring` then `green-verification`. The worker SHALL mark these ids through progress events; undeclared ids are ignored; the plan is never extended or amended.

This per-dispatch plan reconciles with `sai/orchestration/command-runner.md`'s `progress_plan` definition (static, ordered, fully known at dispatch, immutable for the invocation) through the documented multi-dispatch carve-out: each Step dispatch is its own invocation-scoped lifecycle under `apply-coordinator-declares-adapter-fields`, so each dispatch's plan is declared at that dispatch, is fully known before the first worker result of that dispatch, is immutable for that dispatch's lifecycle (including its same-worker recovery continuations), and is never carried in the dispatch envelope. The run-start step projection (the `implementation.md` Step list rendered per `apply-step-projection`) is NOT this plan and is never marked from worker progress events.

#### Scenario: coordinator declares a per-dispatch plan

- **WHEN** the coordinator dispatches a RED or GREEN worker for a Step
- **THEN** it declares that dispatch's milestone plan (two ids, static, ordered) and renders it before the first worker result of that dispatch

#### Scenario: dispatch plan is immutable for its dispatch lifecycle

- **WHEN** a dispatched worker's plan is declared
- **THEN** it is static and immutable for that dispatch's lifecycle, including same-worker recovery continuations, and is never extended, amended, or carried in the envelope

#### Scenario: worker marks the declared milestones

- **WHEN** the dispatched worker completes `test-authoring`, `red-verification`, `implementation`, or `green-verification`
- **THEN** it emits a progress event carrying that id, and the coordinator marks it in the declared plan

#### Scenario: projection is never marked from progress events

- **WHEN** workers emit progress events during the run
- **THEN** the run-start step projection entries are never marked from those events; only the per-dispatch milestone plan is

### Requirement: apply-coordinator-centric-execution

The apply coordinator SHALL remain the executing main-session driver: it performs change resolution, the run-start step projection, scratch sweeps, coordinator verification, checkbox marking, appendices, learnings memory, per-Step and terminal human gates, terminal visibility reporting, exact-path staging, and commits itself. It SHALL perform the once-per-run learnings promotion after the Final sweep and SHALL evaluate the terminal documentation commit immediately afterward. It SHALL NOT delegate these coordinator responsibilities to a worker. The thin-coordinator routed model SHALL NOT be adopted for apply.

#### Scenario: coordinator executes the terminal responsibilities

- **WHEN** all Steps complete and the Final sweep passes
- **THEN** the coordinator promotes learnings once, computes and discloses the terminal documentation set, obtains or observes the existing authorization state, stages only eligible terminal paths, and owns the terminal commit

#### Scenario: workers receive only Step execution

- **WHEN** a RED or GREEN worker is dispatched
- **THEN** it receives the Step execution task (and its dispatch-kind scope) and returns lifecycle payloads; it never receives coordinator authority over gates, appendices, or commits

### Requirement: Apply invocation preserves fast-track gate contracts

The routed `sai/commands/apply/invocation.md` SHALL contain the apply-time session commit authorization and fast-track branch auto-stay contracts that were previously documented in the retired apply instruction surface. Cross-file references SHALL point to the current implementation plan template.

#### Scenario: Routed invocation exposes both restored behaviors
- **WHEN** the routed apply invocation is loaded
- **THEN** it defines session flag activation, reset, scope, and reporting, plus non-detached branch auto-stay and detached-HEAD fallback
