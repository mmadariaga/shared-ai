# Change Overview

## Change Proposal

The shared artifact feedback gate currently presents a user picker after standalone spec and design feedback loops. The supervised Auto pipeline inherits that behavior and can stop twice for user input, which conflicts with its unattended intent.

This change adds an optional `mode` parameter to the shared gate. The omitted default remains `interactive`; explore Auto supplies `mode = supervised` at its spec and design gate application sites. In supervised mode, the shared gate executes the fetch site's `next-action` exactly once after convergence, cap exhaustion, or empty findings, without presenting a picker or free-text path and without advancing the iteration counter. The change also mode-qualifies related placement, machine-feedback, worker-loop coexistence, supervision, and selector wording while preserving standalone interactive behavior.

## Scope

### In scope

- The shared instruction contract in `sai/policies/artifact-feedback-gate.md`.
- Explore item 10's two supervised gate application sites in `sai/commands/explore/instructions.md`.
- Mode-qualified coexistence wording in the spec and design worker contracts.
- Structural tests that pin the policy and source wording.
- Preservation of the existing post-proceed report order and the explore read-only boundary.

### Out of scope

- New capabilities, application runtime code, callable APIs, dependencies, harness install surfaces, panel behavior, or new worker inputs.
- Changes to standalone coordinator fetch sites, which continue to omit `mode` and therefore use the interactive default.
- Question-autonomy, recovery, artifact-review finding shape, review-loop caps, idea-list marking, `.openspec.yaml` writes, or chaining beyond design.

## Capabilities

No new capabilities are introduced. The modified capabilities are:

- `artifact-feedback-gate`: adds the optional supervised mode and single-sourced auto-proceed behavior, with mode-qualified presentation, free-text, proceed, placement, and review-loop scenarios.
- `pipeline-design-phase-chaining`: makes the supervised design gate auto-continue to overview generation and supervised design completion while retaining the direct `/sai-2-design` interactive gate.
- `explore-pipeline-supervision`: supplies supervised mode at both item 10 gate sites and preserves worker interruption, escalation, read-only, and evidence-only marking rules.
- `explore-pipeline-selector`: defines the active supervision interval across the supervised gate application point rather than a user-facing picker.
- `planning-artifact-review-loop`: makes worker-loop coexistence mode-dependent without giving workers mode input or picker logic.

## Target Architecture

### Snapshot

None — no planned public surfaces

This change edits shared instruction prose, explore orchestration wording, and structural tests only; it introduces no application classes, interfaces, or callable APIs.

The shared gate remains the single sequencer. Its three required fetch-site inputs are the artifact list, proceed label, and next action; the optional closed-vocabulary `mode` is declared at the fetch site rather than detected from invocation context. Standalone spec and design coordinators continue to fetch it without `mode`, while explore pre-fetches it once and supplies `mode = supervised` at the spec-to-design and design-to-overview application points.

The supervised path keeps the gate call and delegates execution of the supplied next action to the shared policy. The phase workers retain ownership of their worker loops and change-directory artifacts; they do not receive or evaluate `mode`. Explore remains read-only, and no later phase is dispatched after supervised design completion.

## Key Contracts

- Required gate parameters remain `artifacts`, `proceed-label`, and `next-action`. Optional `mode` is exactly `interactive` or `supervised`; omission behaves as `interactive`, while an invalid non-empty value stops and asks for a valid mode without defaulting or auto-proceeding.
- Interactive mode preserves the two-choice picker, full-word labels, option order, `Give feedback (Recommended)` on the first presentation, `Give more feedback` thereafter, the free-text wording, and the existing step-specific proceed actions.
- Supervised mode presents no picker, feedback option, free-text prompt, or free-text path. After deferred-gate resolution from convergence, one-round cap exhaustion, or empty findings, it executes the current fetch site's `next-action` exactly once, leaves the iteration counter at 0, writes no `.openspec.yaml` approval state, and adds no suppression-specific conversation text.
- The supervised spec site uses `proposal.md, specs/**`, `Finish step`, and the spec-to-design phase transition. The supervised design site uses `design.md, tasks.md, interfaces.md`, `Continue`, and overview generation plus the supervised design terminal; it does not substitute the standalone design completion sentence.
- Gate application remains after the decision summary. Fetching-body reports retain their existing post-proceed order; supervised reports are not moved before auto-proceed.
- A `failed` or `cancelled` worker never reaches auto-proceed. Below-threshold or ungrounded `needs_input` still escalates under question-autonomy policy. Cap exhaustion remains non-failure, and review-item marks remain evidence-only from review-round findings.
- The worker-owned review loop remains in addition to explore's in-session rounds and does not use the machine-feedback adapter. After an interactive or omitted-mode worker-loop ending, the coordinator presents the gate at iteration 0; after a supervised ending, the supervised application point auto-proceeds instead. Workers receive no new mode or lifecycle field.

## File Manifest

The net fold of the design manifest is exactly these seven modified paths:

### Policy and orchestration

- `sai/policies/artifact-feedback-gate.md` — instruction-contract parameters: required `artifacts`, `proceed-label`, `next-action`; optional `mode ∈ {interactive, supervised}` with omitted mode equivalent to interactive; supervised exact-once `next-action`, no picker/free-text/iteration increment/approval-state write.
- `sai/commands/explore/instructions.md` — item 10 supplies `mode = supervised` at both conceptual gate sites: spec artifacts with `Finish step` and phase transition; design artifacts with `Continue` and overview generation plus supervised terminal.
- `sai/commands/design/worker.md` — documentation-only mode-dependent worker-loop coexistence contract; no new worker input or picker logic.
- `sai/commands/spec/worker.md` — documentation-only mode-dependent worker-loop coexistence contract; no new worker input or picker logic.

### Structural tests

- `test/design-coordinator-worker.test.js` — pins shared-policy mode behavior and standalone design coordinator omission of `mode`, including the standalone completion-sentence distinction.
- `test/explore-pipeline-selector.test.js` — pins both supervised mode supplies, supervised next actions, placement/report-order cues, and retained policy/interruption cues.
- `test/spec-coordinator-worker.test.js` — pins shared-policy mode behavior and standalone spec coordinator omission of `mode`, including `Finish step` and the mandatory stop pairing.

No other file is in the design File Manifest. In particular, `sai/commands/spec/coordinator.md` and `sai/commands/design/coordinator.md` remain unchanged fetch sites.

## Review Scenarios

- Omitted or explicit `interactive` mode still presents the ordinary gate at iteration 0 with the existing labels and ordering; invalid mode and missing required parameters stop.
- Supervised spec convergence, cap exhaustion, and empty findings suppress the picker and execute the spec-to-design action once. Supervised design convergence, cap exhaustion, and empty findings suppress the picker and execute overview generation once before supervised design completion.
- Machine-feedback processing remains deferred from user gate presentation; supervised processing does not increment the iteration counter, and cap exhaustion is non-failure.
- Failed or cancelled spec/design workers skip both presentation and auto-proceed, remain retryable, and do not advance the pipeline. Below-threshold `needs_input` still escalates.
- Decision summary precedes gate application, and existing fetching-body reports remain post-proceed. The active supervision interval spans both supervised application points and rejects duplicate starts.
- Explore performs no write under auto-proceed; authorized phase workers alone write their owned change-directory artifacts. Reviewed-item marks depend on High findings, not gate presence.
- Interactive worker-loop endings retain iteration-0 gate presentation, while supervised endings use the shared supervised application point without worker-owned mode branching.

## Implementation Approach

1. Extend the shared gate and co-land policy-pinning assertions in the three existing structural suites. Keep required parameter validation, interactive presentation, failed/cancelled non-advance cues, exact-once supervised sequencing, and no approval-state writes covered.
2. Update explore item 10 to supply `mode = supervised` at both gate sites, preserve the single pre-dispatch fetch, retain the existing post-proceed report order, and extend the explore selector suite. Do not edit the standalone coordinators or add inline auto-proceed logic.
3. Mode-qualify the coexistence sentences in the spec and design worker contracts and extend their coordinator/worker suites. Workers gain no mode input, lifecycle field, or gate logic.

Each step is planned as a green commit boundary. The scoped test command is `node --test test/explore-pipeline-selector.test.js test/spec-coordinator-worker.test.js test/design-coordinator-worker.test.js`; the final step also calls for the full `npm test` suite. Manual verification covers standalone interactive behavior, unattended explore spec-to-design-to-overview behavior, failed-worker stopping, and invalid-mode STOP documentation.

## Approval Summary

This is a medium-complexity, instruction-only change with no application runtime, public surface, dependency, or breaking change. The design records the fetch-site mode decision, shared-policy sequencing decision, mode-qualified wording decision, co-landed structural-test decision, and post-proceed report-order decision. The source artifacts record no open questions or deferred items. Standalone interactive behavior remains the default, while supervised gate suppression is limited to the two explore Auto application sites and preserves the documented interruption and read-only boundaries.
