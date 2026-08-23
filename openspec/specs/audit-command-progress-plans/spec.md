# Audit Command Progress Plans Specification

## Purpose

Define the five-step progress plans for the audit commands (`sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`): their canonical step ids and labels, additive milestone reporting from the audit workers, gated-optional milestone reconciliation, terminal reconciliation, and separation from the `sai-explore` Idea Progress List.

## Requirements

### Requirement: audit-adapters-declare-five-step-plans

The `sai-5-review`, `sai-6-security`, `sai-7-performance`, and `sai-8-accessibility` phase adapters SHALL declare an immutable five-step `progress_plan`. Each plan SHALL use the following stable ids and user-facing labels in the listed order, and each worker contract SHALL enumerate the same ids. The completion condition is the existing workflow boundary shown for each step:

| Command | Ordered progress steps and completion conditions |
| --- | --- |
| `sai-5-review` | `resolve-change` - Resolve change: prerequisites, change selection, and proposal gate complete; `establish-diff-scope` - Resolve diff scope: parent, diff statistics, empty-diff decision, and 500-LOC cutover complete; `resolve-review-analysis` - Resolve review analysis: passes 1-10, delegated research, severity classification, and audit triage complete; `resolve-mutation-analysis` - Resolve mutation-analysis gate: Pass 11 is run when applicable or its gate is recorded as not applicable; `close-review-outcome` - Close review outcome: the review result and any applicable artifact verification are complete |
| `sai-6-security` | `resolve-security-scope` - Resolve security scope: prerequisites, change selection, scope flags, and parent complete; `discover-module-map` - Discover modules and trust boundaries: ecosystems, modules, entry points, trust boundaries, and manifest-change decision complete; `resolve-sast-analysis` - Resolve SAST analysis: taint analysis, direct CWE mapping, and evidence-backed classification complete; `resolve-sca` - Resolve SCA gate: SCA is run when a manifest changed or recorded as skipped when none changed; `close-security-outcome` - Close security outcome: the security result and any applicable artifact verification are complete |
| `sai-7-performance` | `resolve-performance-scope` - Resolve performance scope and tier: prerequisites, change selection, scope grammar, tier filter, and parent complete; `map-stack-hot-paths` - Map stack and hot paths: stack detection, baseline, hot-path mapping, and 500-LOC cutover complete; `audit-performance-tiers` - Resolve performance tier analysis: applicable backend, frontend, database, queue, and cross-cutting checks complete; `resolve-diagnostics` - Resolve diagnostics gate: diagnostics authorization or applicability is resolved, with diagnostics run only when authorized; `close-performance-outcome` - Close performance outcome: the performance result and any applicable artifact verification are complete |
| `sai-8-accessibility` | `resolve-accessibility-scope` - Resolve accessibility scope and runtime mode: prerequisites, change selection, UI-scope/no-UI decision, runtime flag, and parent complete; `map-ui-framework` - Map UI components and framework: UI filtering, framework detection, component mapping, and delegation choice complete; `resolve-static-audit` - Resolve static accessibility audit: semantics, ARIA, keyboard/focus, forms, visual, media, and dynamic checks complete; `resolve-runtime-audit` - Resolve runtime-audit gate: runtime request, server confirmation, and per-command authorization are resolved, with checks run only when applicable; `close-accessibility-outcome` - Close accessibility outcome: the accessibility result and any applicable artifact verification are complete |

The adapters SHALL render these plans through the shared progress policy and SHALL NOT add audit passes, tool names, severity categories, or internal delegation units as additional progress steps. Audit plans SHALL receive closure-only `Milestone Stamp` annotations sourced from the `emitted_on` of the result that marks each step; the `sai-explore` Idea Progress List remains outside this scope.

#### Scenario: review declares its canonical plan

- **WHEN** `sai-5-review` dispatches its worker
- **THEN** its adapter SHALL declare the five review steps in the specified order with the specified labels
- **AND** the worker contract SHALL enumerate the same five ids

#### Scenario: security declares its canonical plan

- **WHEN** `sai-6-security` dispatches its worker
- **THEN** its adapter SHALL declare the five security steps in the specified order with the specified labels
- **AND** the worker contract SHALL enumerate the same five ids

#### Scenario: performance declares its canonical plan

- **WHEN** `sai-7-performance` dispatches its worker
- **THEN** its adapter SHALL declare the five performance steps in the specified order with the specified labels
- **AND** the worker contract SHALL enumerate the same five ids

#### Scenario: accessibility declares its canonical plan

- **WHEN** `sai-8-accessibility` dispatches its worker
- **THEN** its adapter SHALL declare the five accessibility steps in the specified order with the specified labels
- **AND** the worker contract SHALL enumerate the same five ids

#### Scenario: audit plans receive payload-derived milestone stamps

- **WHEN** any audit adapter renders its declared progress plan
- **THEN** the Claude Code and opencode bindings SHALL render each completed step's `Milestone Stamp` from the marking payload's `emitted_on` and make no coordinator clock call
- **AND** the plan's ids, labels, order, and derived states SHALL remain governed by `sai/policies/todo-structure.md`

### Requirement: audit-workers-report-completed-milestones

Each audit worker SHALL emit an additive `Progress Event` after one or more of its declared milestones actually complete. Events SHALL report completed ids in declared plan order and SHALL include the paths written since the preceding worker result. A worker SHALL NOT emit a milestone before its prerequisite and change or scope resolution gates complete, and SHALL continue through the existing audit workflow after the coordinator acknowledges the event.

#### Scenario: audit worker reports a completed batch

- **WHEN** an audit worker completes one or more milestones
- **THEN** it SHALL return a progress event containing the corresponding canonical ids in plan order
- **AND** the coordinator SHALL acknowledge it with `continue_after_progress` without treating that value as user input

#### Scenario: audit workers continue under step-gated instruction delivery

- **WHEN** a security, performance, or accessibility audit worker continues between milestones
- **THEN** it follows the step file named by the most recent `Active step:` pointer from its phase's carved `steps/` library, loaded through `common.md` at dispatch, instead of fetching a wholesale analysis instruction monolith mid-run
- **AND** the plan ids, labels, order, gated-milestone semantics, and report artifact remain exactly as declared in `audit-adapters-declare-five-step-plans`

### Requirement: optional-audit-milestones-reconcile-at-applicability

The optional milestone SHALL be marked completed when its applicability gate is resolved, whether the optional work executes or the gate legitimately determines that it does not apply. The optional milestones are `resolve-mutation-analysis` for review, `resolve-sca` for security, `resolve-diagnostics` for performance, and `resolve-runtime-audit` for accessibility. A skipped optional milestone SHALL remain visible in the declared plan and SHALL NOT claim that an optional tool ran.

#### Scenario: review mutation analysis is gated

- **WHEN** the review worker resolves the Pass 11 mutation-analysis gate
- **THEN** it SHALL report `resolve-mutation-analysis` completed after running the applicable mutation path or determining that the path is not applicable
- **AND** the report SHALL retain the existing mutation-analysis outcome

#### Scenario: security SCA is gated

- **WHEN** the security worker resolves the manifest-change gate for SCA
- **THEN** it SHALL report `resolve-sca` completed after running the applicable SCA path or determining that SCA is not applicable
- **AND** the security report SHALL retain the existing SCA behavior and severity vocabulary

#### Scenario: performance diagnostics are gated

- **WHEN** the performance worker resolves the diagnostics authorization or applicability gate
- **THEN** it SHALL report `resolve-diagnostics` completed after running the authorized diagnostics or determining that they are not applicable
- **AND** the performance report SHALL retain the existing diagnostics outcome

#### Scenario: accessibility runtime checks are gated

- **WHEN** the accessibility worker resolves runtime request, server, and command-authorization gates
- **THEN** it SHALL report `resolve-runtime-audit` completed after running the applicable runtime checks or determining that runtime checks are not applicable
- **AND** the accessibility report SHALL retain the existing static-only and runtime behavior

### Requirement: audit-terminal-reconciliation-preserves-outcomes

At audit run closing, the coordinator SHALL apply the shared task-list reconciliation policy to the last rendered plan state: a `completed` result marks all remaining steps completed, while `needs_input`, `failed`, and `cancelled` results preserve the last rendered states. Before an early terminal outcome, the worker SHALL report the completed resolution and scope milestones that led to it. The early-outcome mapping SHALL be explicit: review empty diff returns its existing `cancelled` result after `resolve-change` and `establish-diff-scope`, leaving those two steps completed, `resolve-review-analysis` in progress, and the final two pending; security and performance empty diff return their existing no-change `completed` results after `resolve-security-scope`/`discover-module-map` or `resolve-performance-scope`/`map-stack-hot-paths`, so the shared completed reconciliation renders all five outcome-oriented steps completed without findings; accessibility no-UI returns its existing skipped-audit `cancelled` result after `resolve-accessibility-scope`, leaving that step completed, `map-ui-framework` in progress, and the final three pending. Progress rendering SHALL NOT replace, delay, or rewrite existing empty-diff, no-UI, failed, cancelled, or successful terminal messages, report-writing rules, or changed-file results.

#### Scenario: successful audit closes the plan

- **WHEN** an audit worker returns its existing `completed` terminal result
- **THEN** the coordinator SHALL render all five progress steps completed
- **AND** it SHALL preserve the worker's existing summary, artifact behavior, changed-file union, and terminal message

#### Scenario: failed or cancelled audit freezes the plan

- **WHEN** an audit worker returns its existing `failed` or `cancelled` terminal result
- **THEN** the coordinator SHALL leave the progress plan at its last rendered states
- **AND** it SHALL preserve the existing failure or cancellation behavior

#### Scenario: empty diff or no UI is detected

- **WHEN** review, security, or performance reaches its existing empty-diff outcome, or accessibility reaches its existing no-UI outcome
- **THEN** progress handling SHALL preserve that command's existing terminal message and artifact behavior
- **AND** the plan SHALL reconcile to the explicit early-outcome state above rather than forcing a report or inventing findings

### Requirement: audit-progress-does-not-change-idea-progress-list

Audit progress plans SHALL remain separate from the `sai-explore` `Idea Progress List`. Adding, rendering, updating, or reconciling an audit progress plan SHALL NOT add, remove, reorder, or mark entries in the Idea Progress List.

#### Scenario: audit runs outside explore mode

- **WHEN** an audit command renders a progress plan
- **THEN** it SHALL update only the audit command's coordinator-owned task-list projection
- **AND** no Idea Progress List entry SHALL be created or changed
