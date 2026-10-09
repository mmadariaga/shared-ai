# Audit Command Progress Plans Specification

## Purpose

Define the five-step progress plans for the audit commands (`sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`): their canonical step ids and labels, additive milestone reporting from the audit workers, gated-optional milestone reconciliation, terminal reconciliation, and separation from the `sai-explore` Idea Progress List.

## Requirements

### Requirement: audit-adapters-declare-five-step-plans

The review adapter SHALL declare an immutable four-step `progress_plan`; security, performance, and accessibility SHALL retain immutable five-step plans. Each worker SHALL enumerate its adapter's stable ids and labels in order. OpenSpec preflight belongs only to `/sai-explore`; startup retains change selection, proposal gate, and scope rules.

| Command | Ordered progress steps and completion conditions |
| --- | --- |
| `sai-5-review` | `resolve-change` - Resolve change: selection and proposal gate complete; `establish-diff-scope` - Resolve diff scope: parent, diff statistics, empty-diff decision, and 500-LOC cutover complete; `resolve-review-analysis` - Resolve review analysis: passes 1–11, delegated research, and audit triage complete; `close-review-outcome` - Close review outcome: classification, adversarial check, report writing and verification complete |
| `sai-6-security` | `resolve-security-scope` - Resolve security scope: selection, proposal gate, scope flags, and parent complete; `discover-module-map` - Discover modules and trust boundaries: ecosystems, modules, entry points, trust boundaries, SCA gate decision, and not-applicable decision complete; `resolve-sast-analysis` - Resolve SAST analysis: taint analysis, direct CWE mapping, and evidence-backed classification complete; `resolve-sca` - Audit dependencies: every manifest the SCA gate admitted is audited, or the step is reported with the SAST batch when the gate admits no manifest; `close-security-outcome` - Close security outcome: result and artifact verification complete |
| `sai-7-performance` | `resolve-performance-scope` - Resolve performance scope and tier: selection, proposal gate, scope grammar, tier filter, and parent complete; `map-stack-hot-paths` - Map stack and hot paths: detection, baseline, mapping, and 500-LOC cutover complete; `audit-performance-tiers` - Resolve performance tier analysis: applicable backend, frontend, database, queue, and cross-cutting checks complete; `resolve-diagnostics` - Resolve diagnostics gate: authorization or applicability resolved, diagnostics run only when authorized; `close-performance-outcome` - Close performance outcome: result and artifact verification complete |
| `sai-8-accessibility` | `resolve-accessibility-scope` - Resolve accessibility scope and runtime mode: selection, proposal gate, UI-scope/no-UI decision, runtime flag, and parent complete; `map-ui-framework` - Map UI components and framework: UI filtering, detection, component mapping, and delegation choice complete; `resolve-static-audit` - Resolve static accessibility audit: semantics, ARIA, keyboard/focus, forms, visual, media, and dynamic checks complete; `resolve-runtime-audit` - Resolve runtime-audit gate: runtime request, server confirmation, and per-command authorization resolved, checks run only when applicable; `close-accessibility-outcome` - Close accessibility outcome: result and artifact verification complete |

Adapters SHALL render through the shared policy and SHALL NOT add passes, tools, severities, or delegation units as steps. Completed steps SHALL receive closure-only Milestone Stamps from the marking response's `received_at`, not a clock call. The Idea Progress List remains separate.

#### Scenario: review declares its canonical plan
- **WHEN** `sai-5-review` dispatches its worker
- **THEN** its adapter declares the four review steps in the specified order with the specified labels
- **AND** the worker enumerates the same four ids

#### Scenario: security declares its canonical plan
- **WHEN** `sai-6-security` dispatches its worker
- **THEN** its adapter declares the five security steps in the specified order with the specified labels
- **AND** the worker enumerates the same five ids

#### Scenario: performance declares its canonical plan
- **WHEN** `sai-7-performance` dispatches its worker
- **THEN** its adapter declares the five performance steps in the specified order with the specified labels
- **AND** the worker enumerates the same five ids

#### Scenario: accessibility declares its canonical plan
- **WHEN** `sai-8-accessibility` dispatches its worker
- **THEN** its adapter declares the five accessibility steps in the specified order with the specified labels
- **AND** the worker enumerates the same five ids

#### Scenario: audit plans receive payload-derived milestone stamps
- **WHEN** an audit adapter renders its plan
- **THEN** Claude Code and opencode render each completed step's stamp from the marking response's `received_at` without a coordinator clock call
- **AND** ids, labels, order, and states remain governed by `sai/policies/todo-structure.md`

#### Scenario: security SCA step label
- **WHEN** the `sai-6-security` plan is rendered
- **THEN** the `resolve-sca` step carries the label "Audit dependencies" and keeps its id

### Requirement: audit-workers-report-completed-milestones

Each worker SHALL return additive progress events after declared milestones complete, with ids in plan order and paths written since the preceding result. Resolution, proposal gate, and scope SHALL pass before events. The first filed pointer SHALL arrive with task disclosure, and the normal first event SHALL report startup and first filed step together. The complete review path SHALL return three events: resolution plus scope, analysis, close. Complete security, performance, and accessibility paths SHALL retain four events. Existing empty-diff and no-UI mappings and terminal behavior SHALL remain, except for security: when its discovery decides the audit does not apply (an empty diff is this case), the first event SHALL also carry `resolve-sast-analysis` and `resolve-sca`, and the run SHALL write the Not Applicable report and return `completed`. Steps SHALL remain distinct and delivered just-in-time; workers SHALL NOT prefetch or own machine state or panel rendering.

#### Scenario: audit worker reports a completed batch
- **WHEN** an audit worker completes one or more milestones
- **THEN** it returns their canonical ids in plan order
- **AND** the coordinator acknowledges with `continue_after_progress` without treating it as user input

#### Scenario: audit workers continue under step-gated instruction delivery
- **WHEN** a security, performance, or accessibility worker continues between milestones
- **THEN** it follows only the most recent `Active step:` pointer into its step library loaded through common.md instead of fetching a monolith
- **AND** ids, labels, order, gated semantics, and report artifacts stay as declared

#### Scenario: security empty diff reports the not-applicable batch
- **WHEN** the security selected diff is empty
- **THEN** the first progress event carries `resolve-security-scope`, `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca`
- **AND** the worker writes the Not Applicable report and returns `completed`

### Requirement: optional-audit-milestones-reconcile-at-applicability

Security `resolve-sca`, performance `resolve-diagnostics`, and accessibility `resolve-runtime-audit` SHALL complete when their applicability gates resolve, whether execution occurs or legitimate skip applies. Skipped milestones SHALL remain visible without claiming execution. Review SHALL have no optional mutation milestone or replacement gate.

#### Scenario: review mutation analysis is gated
- **WHEN** review reaches the end of passes 1–11
- **THEN** it reports analysis complete and receives the close pointer with no mutation gate
- **AND** the report contains no mutation-analysis outcome

#### Scenario: security SCA is gated
- **WHEN** security resolves the manifest-change gate
- **THEN** it reports `resolve-sca` complete after execution or legitimate skip
- **AND** its existing SCA behavior and severity vocabulary remain

#### Scenario: performance diagnostics are gated
- **WHEN** performance resolves diagnostics authorization or applicability
- **THEN** it reports `resolve-diagnostics` complete after authorized execution or legitimate skip
- **AND** its existing diagnostics outcome remains

#### Scenario: accessibility runtime checks are gated
- **WHEN** accessibility resolves runtime request, server, and authorization gates
- **THEN** it reports `resolve-runtime-audit` complete after execution or legitimate skip
- **AND** its static-only and runtime behavior remain

### Requirement: audit-terminal-reconciliation-preserves-outcomes

The coordinator SHALL mark remaining steps completed on `completed`, and preserve last rendered states on `needs_input`, `failed`, or `cancelled`. Early outcomes SHALL report completed milestones: review empty diff returns its existing `cancelled` after resolution and scope, leaving analysis in progress and close pending; security empty diff, or any security scope with no attack surface and no admitted manifest, reports its first four ids together, writes the Not Applicable report, and returns `completed`, reconciling all five steps; performance empty diff returns existing no-change `completed` after its first two ids and reconciles all five steps; accessibility no-UI writes Not Applicable and returns `completed` after its scope id, reconciling all five. Progress SHALL NOT replace, delay, or rewrite terminal messages, report-writing rules, or changed-file results.

#### Scenario: successful audit closes the plan
- **WHEN** a worker returns its existing `completed` result
- **THEN** the coordinator marks all four review steps or all five audit steps complete
- **AND** summary, artifact behavior, changed-file union, and terminal message remain

#### Scenario: failed or cancelled audit freezes the plan
- **WHEN** a worker returns its existing `failed` or `cancelled` result
- **THEN** the coordinator preserves last rendered states
- **AND** failure or cancellation behavior remains

#### Scenario: empty diff or no UI is detected
- **WHEN** review, security, or performance reaches empty diff or accessibility reaches no UI
- **THEN** progress preserves that command's terminal message and artifact behavior, with security writing the Not Applicable report
- **AND** the plan reconciles to its explicit early-outcome state without forcing a findings report or inventing findings

### Requirement: audit-progress-does-not-change-idea-progress-list

Audit progress plans SHALL remain separate from the `sai-explore` `Idea Progress List`. Adding, rendering, updating, or reconciling an audit progress plan SHALL NOT add, remove, reorder, or mark entries in the Idea Progress List.

#### Scenario: audit runs outside explore mode

- **WHEN** an audit command renders a progress plan
- **THEN** it SHALL update only the audit command's coordinator-owned task-list projection
- **AND** no Idea Progress List entry SHALL be created or changed
