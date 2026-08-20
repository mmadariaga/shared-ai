# pipeline-design-phase-chaining Specification

## Purpose

TBD - created by archiving change extend-pipeline-supervision-to-sai-2. Update Purpose after archive.

## Requirements

### Requirement: Chain design under Auto

The existing chained design worker SHALL run under the same Auto invocation, with review, escalation, failure, retry, and no-later-phase rules unchanged.

#### Scenario: spec phase permits chaining
- **WHEN** an Auto-supervised spec phase converges or exhausts its cap
- **THEN** the pipeline dispatches the existing sai-2 design-planning worker for the same change through its existing binding
- **AND** the design worker runs through its existing binding without requiring another selector action

#### Scenario: cap-exhausted spec phase chains design
- **WHEN** the supervised spec phase ends by cap exhaustion after the last round's findings were applied
- **THEN** the pipeline dispatches the existing sai-2 design-planning worker for the same change
- **AND** it does so without another selector action and without classifying the spec ending as failure

#### Scenario: design worker and notice protocol are unchanged
- **WHEN** the chained design worker emits a design notice
- **THEN** the pipeline handles the notice through the coordinator contract's notice extension and forwards its fixed acknowledgement
- **AND** it introduces no new design-worker lifecycle status, binding, or notice shape

#### Scenario: failed or cancelled spec worker does not chain design
- **WHEN** the supervised spec phase ends with a `failed` or `cancelled` spec worker
- **THEN** the pipeline does not dispatch the design worker
- **AND** the supervised run terminates after the spec-phase reporting

### Requirement: Chained design artifacts receive bounded in-session review rounds

The chained design phase SHALL subject the design worker's generated artifacts — `design.md`, `tasks.md`, and `interfaces.md` — to bounded in-session review rounds that mirror the spec phase but are owned by this capability for the design worker and design artifacts. Each round SHALL be performed by the explore coordinator itself through the review engine per the `supervised-review-in-session` capability, invoked with the change name and the `sai-2` artifact-set designator, and SHALL form findings only from that round's fresh engine reread of the design artifacts in their current state. No reviewer subagent SHALL be dispatched for any design round. The rounds SHALL evaluate design-to-spec consistency, coverage of the specs' requirements and the crystallized intent, feasibility and testability of the planned tasks, and unsupported assumptions, and SHALL return findings under the closed `High`/`Medium`/`Low` severity contract defined by the `pipeline-review-severity` capability. Every actionable finding SHALL be processed through the design-phase machine-feedback adapter defined below against the same design worker continuation; the design worker SHALL retain exclusive ownership of every design-artifact edit and per-finding legitimacy evaluation, and pipeline supervision SHALL NOT edit design artifacts or silently suppress findings. A completed round containing at least one `High` finding SHALL close the design bound as non-failure cap exhaustion; a completed round containing no `High` finding SHALL declare design-phase convergence, with `Medium` and `Low` findings processed and visible but non-blocking. The design loop SHALL run at most one review round — a cap of the same size the spec phase uses — counted under the design phase's own counter, with the counting rule owned by the `supervised-review-rounds` capability rather than restated here.

#### Scenario: design artifacts are reviewed after generation
- **WHEN** the chained design worker has produced `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** the pipeline runs in-session review rounds over those design artifacts through the engine
- **AND** it runs no further round: a completed round containing a `High` finding closes the bound as cap exhaustion
- **AND** it declares design-phase convergence when a completed round contains no `High` finding

#### Scenario: design review uses a one-round cap of the same size as the spec phase
- **WHEN** the design review loop runs
- **THEN** it runs at most one review round for the design phase, counted under the design phase's own counter per the `supervised-review-rounds` capability
- **AND** the cap is of the same size the spec phase uses, not a shared budget spanning both phases

#### Scenario: no reviewer subagent is dispatched for design rounds
- **WHEN** the pipeline runs a design-phase review round
- **THEN** the coordinator performs the round in-session through the engine
- **AND** no reviewer subagent is dispatched for the round

#### Scenario: design finding edits are owned by the design worker
- **WHEN** a design-phase review round returns an actionable finding
- **THEN** the finding is processed through the design-phase machine-feedback adapter against the same design worker continuation
- **AND** every accepted edit is made by the design worker, not by pipeline supervision

### Requirement: Design review findings use a design-phase machine-feedback adapter with a deferred user gate

The chained design phase SHALL own a machine-feedback adapter that continues each completed design round's structured findings to the same design worker, rather than reusing the sai-1 machine-feedback adapter, which is textually scoped to supervised sai-1 findings and continues to the spec-proposal worker. For every completed round the design-phase adapter SHALL apply the shared artifact-feedback-gate's canonical per-item semantics — per-item split, legitimacy judgment, artifact-only edits confined to `design.md`, `tasks.md`, and `interfaces.md`, specific discard reasons, and design-summary recomputation — reusing those single-sourced semantics without restating them. Machine-feedback processing is not a user feedback turn: it SHALL NOT present the gate picker, emit the empty-turn user-feedback prompt, increment the iteration counter, or execute the proceed branch. The design-phase fetch of the shared artifact feedback gate SHALL supply `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, `next-action = the post-gate overview generation and supervised design terminal`, and `mode = supervised`. While the design round's machine-feedback processing is still in progress, the user-facing design feedback gate SHALL remain deferred. After the design review round converges or exhausts the one-round cap, because `mode` is `supervised`, the gate SHALL NOT present the picker, free-text prompt, or free-text path and SHALL NOT increment the iteration counter; it SHALL execute `next-action` exactly once — the worker-owned `change-overview.md` generation pass over the same design worker with the current invocation's `overview_language`. The interactive presentation of that gate (iteration 0, `Give feedback (Recommended)` then `Continue`) remains the contract of a directly invoked `/sai-2-design` fetch site that omits `mode`.

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

### Requirement: Design-worker questions are auto-answered or escalated under the same gate

A design worker `needs_input` question raised during the chained design phase SHALL be resolved by the same confidence-thresholded gate the spec phase uses, owned here for the design worker: explore MAY auto-answer only when its confidence is clearly above the qualitative threshold and the answer is grounded in the design phase's permitted sources, SHALL escalate otherwise, and SHALL resolve ambiguity toward escalation. The permitted grounding sources for a design-phase auto-answer are the design worker's `needs_input` payload, the selected change's crystallized block, the approved spec artifacts (`proposal.md` and `specs/**`), and the design artifacts the design phase has itself written so far; the surrounding explore conversation SHALL remain excluded. For a closed-choice question the auto-answer SHALL be one of the worker's own offered option values. Every escalated question SHALL present the worker's exact question and options unmodified through the harness-native picker, and explore SHALL continue the same design worker with the user's answer.

#### Scenario: grounded design question is auto-answered
- **WHEN** the chained design worker returns `needs_input` and the answer is determinable from the crystallized block, the approved spec artifacts, or the design artifacts written so far, and explore is clearly above the confidence threshold
- **THEN** explore auto-answers within the worker's offered values and continues the same design worker
- **AND** it records the question, answer, and grounding citation for the design-phase autonomy audit log

#### Scenario: ungrounded or borderline design question escalates
- **WHEN** a design worker question's answer is not grounded in the design phase's permitted sources, or explore's confidence is borderline or unclear
- **THEN** explore escalates the exact question and options to the user and does not auto-answer
- **AND** it continues the same design worker only with the user's answer

#### Scenario: explore conversation is not a design grounding source
- **WHEN** a design worker question could seemingly be answered from the explore conversation but is not determined by the crystallized block, the spec artifacts, or the design artifacts
- **THEN** explore treats the answer as ungrounded and escalates the question

### Requirement: Chained design phase ends with supervised completion and chains no later phase

When the chained design phase reaches convergence or cap exhaustion, explore SHALL apply the shared artifact feedback gate with `mode = supervised`, and the gate SHALL execute the Continue next-action (overview generation) exactly once; explore SHALL then emit design-phase supervised completion, suppressing the standalone `/sai-2-design` navigation sentence for this supervised run. On design convergence, the design-phase convergence report SHALL state that the design phase converged, the number of design review rounds used, and that the last completed round found no `High` findings, carrying the not-re-reviewed qualification when that round accepted `Medium` or `Low` edits — mirroring the spec-phase convergence report wording. At every design-phase ending — convergence, cap exhaustion, or a `failed` or `cancelled` design worker — explore SHALL present a design-phase autonomy audit log in the conversation that lists every design-phase auto-answer with its answer and grounding citation identifying which permitted source and what within it determined the answer, states the count of escalated design-phase questions as the calibration denominator, and is written to no file, artifact, or configuration. A design cap exhaustion SHALL be reported as the one-line count report of the last round, SHALL NOT be classified as failure, and SHALL NOT assert that `High` findings remain in the current state. A `failed` or `cancelled` design worker SHALL end the supervised run under its lifecycle result without auto-proceeding the gate, leave the change uncompleted and retryable, and keep the name in `specs_converged_changes`, with a later `Auto` selection resuming at the design phase. The supervised run SHALL NOT dispatch `/sai-3-implement` or any later-phase worker, and SHALL report that sai-3 was not run.

#### Scenario: chained design converges
- **WHEN** the chained design phase converges after its review rounds and user-facing artifact feedback gate
- **THEN** explore emits design-phase supervised completion and does not relay the standalone `/sai-2-design` navigation sentence
- **AND** the convergence report states the number of design review rounds used and that the last completed round found no `High` findings
- **AND** when the converging round accepted `Medium` or `Low` edits, the report states that the resulting artifact state was not re-reviewed rather than claiming the edited state is free of `High` findings
- **AND** it presents the design-phase autonomy audit log and reports that sai-3 was not run

#### Scenario: chained design exhausts the cap
- **WHEN** the third design review round still contains a `High` finding and its findings have been applied
- **THEN** the design review loop terminates as non-failure cap exhaustion reported as the one-line count report of the last round
- **AND** explore emits design-phase supervised completion and dispatches no later-phase worker

#### Scenario: no later phase is ever chained
- **WHEN** the chained design phase reaches any terminal outcome
- **THEN** the supervised run never dispatches `/sai-3-implement` or any phase after design
