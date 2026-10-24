# Audit Command Progress Plans Specification

## Purpose

Define the five-step progress plans for the audit commands (`sai-5-review`, `sai-6-security`, `sai-7-performance`, `sai-8-accessibility`): their canonical step ids and labels, additive milestone reporting from the audit workers, gated-optional milestone reconciliation, terminal reconciliation, and separation from the `sai-explore` Idea Progress List.

## Requirements

### Requirement: audit-adapters-declare-five-step-plans

Security, performance, and accessibility SHALL each keep an immutable five-step plan of stable ids, delivered by pointer through `security-steps@1`, `performance-steps@1`, and `accessibility-steps@1`, and each worker card SHALL enumerate its plan's ids in order. The standalone audit commands SHALL declare no panel `progress_plan` and render no task list. OpenSpec preflight belongs only to `/sai-explore`; the shared audit coordinator owns change selection and the proposal gate, and the worker's scope step owns the scope rules.

| Command | Ordered step ids and completion conditions |
| --- | --- |
| `sai-5-security` | `resolve-security-scope` - brief read, scope and parent branch resolved; `discover-module-map` - modules, entry points, trust boundaries, SCA gate decision, and not-applicable decision complete; `resolve-sast-analysis` - taint analysis, direct CWE mapping, and evidence-backed classification complete; `resolve-sca` - every manifest the SCA gate admitted is audited, or the step is reported with the SAST batch when the gate admits no manifest; `close-security-outcome` - report written and verified |
| `sai-6-performance` | `resolve-performance-scope` - brief read, scope, tier filter, runtime flag, and parent branch resolved; `map-stack-hot-paths` - detection, baseline, mapping, and 500-LOC cutover complete; `audit-performance-tiers` - applicable backend, frontend, database, queue, and cross-cutting checks complete; `resolve-diagnostics` - every diagnostic that firms up a finding has run or is recorded as unavailable, or the step is reported with the tier batch without `--runtime`; `close-performance-outcome` - report written and verified |
| `sai-7-accessibility` | `resolve-accessibility-scope` - brief read, scope, runtime mode, dev-server URL, and parent branch resolved; `map-ui-framework` - UI filtering, detection, component mapping, and delegation choice complete; `resolve-static-audit` - semantics, ARIA, keyboard/focus, forms, visual, media, and dynamic checks complete; `resolve-runtime-audit` - every applicable scanner has run or is recorded as unavailable, or the step is reported with the static batch without `--runtime`; `close-accessibility-outcome` - report written and verified |

Plans SHALL NOT add passes, tools, severities, or delegation units as steps. The Idea Progress List remains separate.

#### Scenario: review declares its canonical plan
- **WHEN** `/sai-4-review` dispatches its worker
- **THEN** its command declares no `progress_plan`: its steps are routed by the `review-steps@1` machine, which creates no task list, and the worker enumerates no progress ids

#### Scenario: security declares its canonical plan
- **WHEN** `sai-5-security` creates its worker
- **THEN** the coordinator resets `security-steps@1`, whose steps are the five security ids in the specified order
- **AND** the worker card enumerates the same five ids

#### Scenario: performance declares its canonical plan
- **WHEN** `sai-6-performance` creates its worker
- **THEN** the coordinator resets `performance-steps@1`, whose steps are the five performance ids in the specified order
- **AND** the worker card enumerates the same five ids

#### Scenario: accessibility declares its canonical plan
- **WHEN** `sai-7-accessibility` creates its worker
- **THEN** the coordinator resets `accessibility-steps@1`, whose steps are the five accessibility ids in the specified order
- **AND** the worker card enumerates the same five ids

#### Scenario: audit plans receive payload-derived milestone stamps
- **WHEN** a standalone audit runs on Claude Code or opencode
- **THEN** no panel task list is rendered and no milestone stamp is written
- **AND** step state lives only in the cycle's `sai-state` session

#### Scenario: security SCA step label
- **WHEN** the security worker card names the `resolve-sca` step
- **THEN** the step keeps its id `resolve-sca`

### Requirement: audit-workers-report-completed-milestones

Each worker SHALL return a `step-done` result after its steps complete, carrying every newly completed id in plan order. The first pointer SHALL arrive with the task message, and the first batch SHALL report the fileless scope step with the first filed step. A step the worker skips because it does not apply SHALL be reported in the batch of the step that decided the skip. When security discovery decides the audit does not apply (an empty diff is this case), the first batch SHALL also carry `resolve-sast-analysis` and `resolve-sca`; when performance mapping decides it does not apply, the first batch SHALL also carry `audit-performance-tiers` and `resolve-diagnostics`; when accessibility mapping finds no UI file, the first batch SHALL also carry `resolve-static-audit` and `resolve-runtime-audit`; each then writes the Not Applicable report and returns `completed`. Steps SHALL remain distinct and delivered just-in-time; workers SHALL NOT prefetch or own machine state.

#### Scenario: audit worker reports a completed batch
- **WHEN** an audit worker completes one or more steps
- **THEN** it returns `step-done` with their canonical ids in plan order
- **AND** the coordinator emits them to the audit's step machine and sends the next pointer, without treating the batch as user input

#### Scenario: audit workers continue under step-gated instruction delivery
- **WHEN** a security, performance, or accessibility worker continues between steps
- **THEN** it follows only the most recent `Active step:` pointer into its step library instead of fetching a monolith
- **AND** ids, order, gated semantics, and report artifacts stay as declared

#### Scenario: security empty diff reports the not-applicable batch
- **WHEN** the security selected diff is empty
- **THEN** the first `step-done` batch carries `resolve-security-scope`, `discover-module-map`, `resolve-sast-analysis`, and `resolve-sca`
- **AND** the worker writes the Not Applicable report and returns `completed`

### Requirement: optional-audit-milestones-reconcile-at-applicability

Security `resolve-sca`, performance `resolve-diagnostics`, and accessibility `resolve-runtime-audit` SHALL complete when their applicability gates resolve, whether execution occurs or the stage does not apply. A stage that does not apply SHALL be reported without claiming execution, and the report SHALL say why it did not run.

#### Scenario: review mutation analysis is gated
- **WHEN** review reaches the end of its passes 1–11
- **THEN** it reports `resolve-review-analysis` complete and receives the close pointer, with no mutation gate
- **AND** the report contains no mutation-analysis outcome

#### Scenario: security SCA is gated
- **WHEN** security resolves the manifest-change gate
- **THEN** it reports `resolve-sca` complete after execution, or with the SAST batch when no manifest is admitted
- **AND** its existing SCA behavior and severity vocabulary remain

#### Scenario: performance diagnostics are gated
- **WHEN** performance resolves diagnostics applicability
- **THEN** it reports `resolve-diagnostics` complete after the diagnostics ran or were recorded as unavailable, or with the tier batch without `--runtime`
- **AND** no authorization question is asked

#### Scenario: accessibility runtime checks are gated
- **WHEN** accessibility resolves its runtime gate
- **THEN** it reports `resolve-runtime-audit` complete after the scanners ran or were recorded as unavailable, or with the static batch without `--runtime`
- **AND** its static-only and runtime behavior remain

### Requirement: audit-terminal-reconciliation-preserves-outcomes

The audit coordinator SHALL close the cycle's `sai-state` session in every outcome. On `completed` it SHALL verify and commit the report and print the closing report; on `failed` it SHALL print the worker's summary with no closing line and commit nothing. Not Applicable outcomes (security with no attack surface and no admitted manifest, performance with no performance surface, accessibility with no UI file) SHALL write the Not Applicable report, return `completed`, and be verified and committed like any report. Step state SHALL NOT replace, delay, or rewrite terminal messages, report-writing rules, or changed-file results.

#### Scenario: successful audit closes the plan
- **WHEN** a worker returns `completed`
- **THEN** the coordinator verifies and commits the report, prints the closing report, and closes the session
- **AND** summary, artifact behavior, and changed-file results remain

#### Scenario: failed or cancelled audit freezes the plan
- **WHEN** a worker returns `failed`
- **THEN** the coordinator prints the worker's summary, commits nothing, and closes the session

#### Scenario: empty diff or no UI is detected
- **WHEN** security or performance reaches an empty diff or accessibility reaches no UI
- **THEN** the worker writes the Not Applicable report and returns `completed`, and the coordinator verifies and commits it
- **AND** no findings report is forced and no finding is invented

### Requirement: audit-progress-does-not-change-idea-progress-list

Audit progress plans SHALL remain separate from the `sai-explore` `Idea Progress List`. Adding, rendering, updating, or reconciling an audit progress plan SHALL NOT add, remove, reorder, or mark entries in the Idea Progress List.

#### Scenario: audit runs outside explore mode

- **WHEN** an audit command renders a progress plan
- **THEN** it SHALL update only the audit command's coordinator-owned task-list projection
- **AND** no Idea Progress List entry SHALL be created or changed
