## MODIFIED Requirements

### Requirement: Design review findings use a design-phase machine-feedback adapter with a deferred user gate

The chained design phase SHALL own a machine-feedback adapter that continues each completed design round's structured findings to the same design worker, rather than reusing the sai-1 machine-feedback adapter, which is textually scoped to supervised sai-1 findings and continues to the spec-proposal worker. For every completed round the design-phase adapter SHALL apply the shared artifact-feedback-gate's canonical per-item semantics — per-item split, legitimacy judgment, artifact-only edits confined to `design.md`, `tasks.md`, and `interfaces.md`, specific discard reasons, and design-summary recomputation — reusing those single-sourced semantics without restating them. Machine-feedback processing is not a user feedback turn: it SHALL NOT present the gate picker, emit the empty-turn user-feedback prompt, increment the iteration counter, or execute the proceed branch.

The design-phase fetch of the shared artifact feedback gate SHALL supply `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, `next-action = the post-gate overview generation and supervised design terminal`, and `mode = supervised`. While the design round's machine-feedback processing is still in progress, the user-facing design feedback gate SHALL remain deferred. After the design review round converges or exhausts the one-round cap, because `mode` is `supervised`, the gate SHALL NOT present the picker, free-text prompt, or free-text path and SHALL NOT increment the iteration counter; it SHALL execute `next-action` exactly once — the worker-owned `change-overview.md` generation pass over the same design worker with the current invocation's `overview_language`. The interactive presentation of that gate (iteration 0, `Give feedback (Recommended)` then `Continue`) remains the contract of a directly invoked `/sai-2-design` fetch site that omits `mode`.

#### Scenario: design machine findings continue to the design worker

- **WHEN** a completed design review round returns one or more structured findings
- **THEN** the design-phase machine-feedback adapter continues each finding to the same design worker for canonical per-item evaluation
- **AND** accepted edits stay within `design.md`, `tasks.md`, and `interfaces.md`
- **AND** every discarded finding is reported with its specific reason

#### Scenario: user design gate is deferred while the round is processed

- **WHEN** a design round's machine-feedback processing is still in progress
- **THEN** the processing completes without presenting or advancing the user-facing design gate
- **AND** the iteration counter remains 0

#### Scenario: supervised design convergence auto-continues to overview generation

- **WHEN** the supervised design review round converges (no `High` findings) after machine-feedback processing
- **THEN** the design artifact gate is not presented
- **AND** the iteration counter remains 0
- **AND** the gate executes the Continue next-action exactly once — the overview-generation pass on the same design worker with the current `overview_language`

#### Scenario: supervised design cap exhaustion auto-continues to overview generation

- **WHEN** the supervised design review round exhausts its one-round cap after applying findings
- **THEN** the design artifact gate is not presented
- **AND** cap exhaustion remains a non-failure outcome
- **AND** the gate executes the Continue next-action exactly once — the overview-generation pass on the same design worker

#### Scenario: supervised design empty findings auto-continues to overview generation

- **WHEN** a supervised design review round returns an empty findings array
- **THEN** the design-phase machine-feedback adapter makes no artifact edit
- **AND** the design artifact gate is not presented
- **AND** the iteration counter remains 0
- **AND** the gate executes the Continue next-action exactly once — the overview-generation pass on the same design worker

#### Scenario: interactive design gate remains for direct sai-2

- **WHEN** `/sai-2-design` is invoked directly and its coordinator fetches the shared gate without supplying `mode`
- **THEN** after design convergence or cap exhaustion the user-facing design feedback gate is presented at iteration 0
- **AND** it names `design.md`, `tasks.md`, and `interfaces.md` with proceed-label `Continue`
- **AND** the first option remains `Give feedback (Recommended)`

### Requirement: Chained design phase ends with supervised completion and chains no later phase

When the chained design phase reaches convergence or cap exhaustion, explore SHALL apply the shared artifact feedback gate with `mode = supervised`, and the gate SHALL execute the Continue next-action (overview generation) exactly once; explore SHALL then emit design-phase supervised completion, suppressing the standalone `/sai-2-design` navigation sentence for this supervised run. Explore SHALL NOT reimplement auto-proceed inline outside the shared gate policy. On design convergence, the design-phase convergence report SHALL state that the design phase converged, the number of design review rounds used, and that the last completed round found no `High` findings, carrying the not-re-reviewed qualification when that round accepted `Medium` or `Low` edits — mirroring the spec-phase convergence report wording. At every design-phase ending — convergence, cap exhaustion, or a `failed` or `cancelled` design worker — explore SHALL present a design-phase autonomy audit log in the conversation that lists every design-phase auto-answer with its answer and grounding citation identifying which permitted source and what within it determined the answer, states the count of escalated design-phase questions as the calibration denominator, and is written to no file, artifact, or configuration. A design cap exhaustion SHALL be reported as the one-line count report of the last round, SHALL NOT be classified as failure, and SHALL NOT assert that `High` findings remain in the current state. A `failed` or `cancelled` design worker SHALL end the supervised run under its lifecycle result without auto-proceeding the gate, leave the change uncompleted and retryable, and keep the name in `specs_converged_changes`, with a later `Auto` selection resuming at the design phase. The supervised run SHALL NOT dispatch `/sai-3-implement` or any later-phase worker, and SHALL report that sai-3 was not run.

#### Scenario: chained design converges

- **WHEN** the chained design phase converges after its review rounds and supervised auto-proceed of the design artifact gate
- **THEN** explore emits design-phase supervised completion and does not relay the standalone `/sai-2-design` navigation sentence
- **AND** the convergence report states the number of design review rounds used and that the last completed round found no `High` findings
- **AND** when the converging round accepted `Medium` or `Low` edits, the report states that the resulting artifact state was not re-reviewed rather than claiming the edited state is free of `High` findings
- **AND** it presents the design-phase autonomy audit log and reports that sai-3 was not run

#### Scenario: chained design exhausts the cap

- **WHEN** the design review round still contains a `High` finding after its findings have been applied and the one-round cap is exhausted
- **THEN** the design review loop terminates as non-failure cap exhaustion reported as the one-line count report of the last round
- **AND** the supervised design gate auto-proceeds to overview generation
- **AND** explore emits design-phase supervised completion and dispatches no later-phase worker

#### Scenario: no later phase is ever chained

- **WHEN** the chained design phase reaches any terminal outcome
- **THEN** the supervised run never dispatches `/sai-3-implement` or any phase after design

#### Scenario: failed design worker does not auto-proceed the gate

- **WHEN** the design worker returns `failed` or `cancelled`
- **THEN** explore does not present the design gate and does not auto-execute overview generation
- **AND** it reports the outcome and design autonomy audit, clears `active_phase` and `active_change`, leaves the name out of `completed_changes`, and retains it in `specs_converged_changes`
