# pipeline-design-phase-chaining Specification

## Purpose

TBD - created by archiving change extend-pipeline-supervision-to-sai-2. Update Purpose after archive.

## Requirements

### Requirement: The design phase is chained after spec-phase convergence

When `start-pipeline` supervision is active on Claude Code or opencode and the supervised spec phase converges, the pipeline SHALL dispatch the existing sai-2 design-planning worker for the same selected change under the same `start-pipeline` invocation, without requiring a second token. The design phase SHALL run only after the phase-transition report defined by the `pipeline-phase-transition` capability, and SHALL be entered only on spec-phase convergence — never on cap exhaustion, reviewer failure, reviewer cancellation, a severity-contract violation, or a `failed` or `cancelled` spec worker. The design worker, its harness binding, and its design-notice protocol SHALL be consumed unchanged; the design-notice extension and its fixed acknowledgement SHALL be handled per the coordinator contract.

#### Scenario: spec phase converges and design is chained
- **WHEN** the supervised spec phase converges under a single `start-pipeline` invocation on Claude Code or opencode
- **THEN** the pipeline dispatches the existing sai-2 design-planning worker for the same change through its existing binding
- **AND** it does so without requiring a second `start-pipeline` token

#### Scenario: design worker and notice protocol are unchanged
- **WHEN** the chained design worker emits a design notice
- **THEN** the pipeline handles the notice through the coordinator contract's notice extension and forwards its fixed acknowledgement
- **AND** it introduces no new design-worker lifecycle status, binding, or notice shape

#### Scenario: non-convergent spec ending does not chain design
- **WHEN** the supervised spec phase ends by cap exhaustion, reviewer failure, reviewer cancellation, a severity-contract violation, or a `failed` or `cancelled` spec worker
- **THEN** the pipeline does not dispatch the design worker
- **AND** the supervised run terminates after the spec-phase reporting

### Requirement: Chained design artifacts receive a bounded independent-review convergence loop

The chained design phase SHALL subject the design worker's generated artifacts — `design.md`, `tasks.md`, and `interfaces.md` — to a bounded independent-review convergence loop that mirrors the spec phase but is owned by this capability for the design worker and design artifacts. For each pass the pipeline SHALL create a fresh isolated reviewer, independent of the routed lifecycle and every prior reviewer, that receives only the selected change's crystallized block, the approved spec artifacts (`proposal.md` and `specs/**`), and the generated design artifacts in their current state, and that receives no explore conversation, design-worker reasoning history, prior reviewer state, or unrelated repository context. The reviewer SHALL evaluate design-to-spec consistency, coverage of the specs' requirements and the crystallized intent, feasibility and testability of the planned tasks, and unsupported assumptions, and SHALL return findings under the closed `High`/`Medium`/`Low` severity contract defined by the `pipeline-review-severity` capability. Every actionable finding SHALL be processed through the design-phase machine-feedback adapter defined below against the same design worker continuation; the design worker SHALL retain exclusive ownership of every design-artifact edit and per-finding legitimacy evaluation, and pipeline supervision SHALL NOT edit design artifacts or silently suppress findings. A completed pass containing at least one `High` finding SHALL trigger another fresh pass when the pass cap permits it; a completed pass containing no `High` finding SHALL declare design-phase convergence, with `Medium` and `Low` findings processed and visible but non-blocking. The loop SHALL dispatch at most three review passes — the same cap the spec phase uses — rather than defining a separate design-phase cap.

#### Scenario: design artifacts are reviewed after generation
- **WHEN** the chained design worker has produced `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** the pipeline runs an independent review pass over those design artifacts
- **AND** it runs another fresh pass only when a completed pass contains a `High` finding and the three-pass bound permits it
- **AND** it declares design-phase convergence when a completed pass contains no `High` finding

#### Scenario: design review uses the same three-pass cap as the spec phase
- **WHEN** the design review loop runs
- **THEN** it dispatches at most three review passes for the design phase
- **AND** it does not define a separate design-phase cap

#### Scenario: design reviewer is independently isolated
- **WHEN** the pipeline dispatches a design-phase review pass
- **THEN** the reviewer receives only the crystallized block, the approved spec artifacts, and the generated design artifacts
- **AND** it does not receive the explore conversation, the design worker's reasoning history, or prior reviewer state

#### Scenario: design finding edits are owned by the design worker
- **WHEN** a design-phase reviewer returns an actionable finding
- **THEN** the finding is processed through the design-phase machine-feedback adapter against the same design worker continuation
- **AND** every accepted edit is made by the design worker, not by pipeline supervision

### Requirement: Design review findings use a design-phase machine-feedback adapter with a deferred user gate

The chained design phase SHALL own a machine-feedback adapter that continues each completed design pass's structured findings to the same design worker, rather than reusing the sai-1 machine-feedback adapter, which is textually scoped to supervised sai-1 findings and continues to the spec-proposal worker. For every completed pass the design-phase adapter SHALL apply the shared artifact-feedback-gate's canonical per-item semantics — per-item split, legitimacy judgment, artifact-only edits confined to `design.md`, `tasks.md`, and `interfaces.md`, specific discard reasons, and design-summary recomputation — reusing those single-sourced semantics without restating them. Machine-feedback processing is not a user feedback turn: it SHALL NOT present the gate picker, emit the empty-turn user-feedback prompt, increment the iteration counter, or execute the proceed branch. The user-facing design feedback gate — the existing sai-2 gate naming `design.md`, `tasks.md`, and `interfaces.md` with proceed-label `Continue` — SHALL be deferred while another design pass is required and SHALL be presented for the first time at iteration 0 only after the design review loop converges, exhausts its three-pass cap, or is interrupted by a design reviewer failure, cancellation, or severity-contract violation.

#### Scenario: design machine findings continue to the design worker
- **WHEN** a completed design review pass returns one or more structured findings
- **THEN** the design-phase machine-feedback adapter continues each finding to the same design worker for canonical per-item evaluation
- **AND** accepted edits stay within `design.md`, `tasks.md`, and `interfaces.md`
- **AND** every discarded finding is reported with its specific reason

#### Scenario: user design gate is deferred while another pass remains
- **WHEN** a completed design pass contains a `High` finding and another pass remains within the three-pass bound
- **THEN** machine-feedback processing completes without presenting or advancing the user-facing design gate
- **AND** the iteration counter remains 0

#### Scenario: user design gate opens after the loop terminates
- **WHEN** the design review loop converges, exhausts its three-pass cap, or is interrupted by a reviewer failure, cancellation, or severity-contract violation
- **THEN** the user-facing design feedback gate is presented for the first time at iteration 0
- **AND** it names `design.md`, `tasks.md`, and `interfaces.md` with proceed-label `Continue`

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

When the chained design phase reaches convergence or cap exhaustion, explore SHALL emit design-phase supervised completion, suppressing the standalone `/sai-2-design` navigation sentence for this supervised run. At every design-phase ending — convergence, cap exhaustion, a design reviewer failure or cancellation, a severity-contract violation, or a `failed` or `cancelled` design worker — explore SHALL present a design-phase autonomy audit log in the conversation that lists every design-phase auto-answer with its answer and grounding citation identifying which permitted source and what within it determined the answer, states the count of escalated design-phase questions as the calibration denominator, and is written to no file, artifact, or configuration. A design reviewer failure, cancellation, or severity-contract violation SHALL stop the design review loop without automatic retry, later dispatch, fabricated finding, or direct artifact repair and SHALL be reported with its distinguishing cause; it is non-terminal for the change, whose tracked-set completion state SHALL follow the design worker's terminal result per the `explore-pipeline-supervision` capability rather than the reviewer result. A `failed` or `cancelled` design worker SHALL end the supervised run under its lifecycle result and leave the change uncompleted and retryable, with a later `start-pipeline` resuming at the design phase. The supervised run SHALL NOT dispatch `/sai-3-implement` or any later-phase worker, and SHALL report that sai-3 was not run.

#### Scenario: chained design converges
- **WHEN** the chained design phase converges after its review loop and user-facing artifact feedback gate
- **THEN** explore emits design-phase supervised completion and does not relay the standalone `/sai-2-design` navigation sentence
- **AND** it presents the design-phase autonomy audit log and reports that sai-3 was not run

#### Scenario: chained design exhausts the cap
- **WHEN** the third design review pass still contains a `High` finding
- **THEN** the design review loop terminates as non-failure cap exhaustion with every outstanding `High` finding intact
- **AND** explore emits design-phase supervised completion and dispatches no later-phase worker

#### Scenario: design reviewer failure does not authorize repair or a later phase
- **WHEN** a design-phase reviewer returns `review_failed`, `review_cancelled`, or a severity-contract violation
- **THEN** explore reports that the design review did not complete with its distinguishing cause and performs no automatic retry or direct artifact edit
- **AND** it presents the design-phase autonomy audit log and dispatches no later-phase worker

#### Scenario: no later phase is ever chained
- **WHEN** the chained design phase reaches any terminal outcome
- **THEN** the supervised run never dispatches `/sai-3-implement` or any phase after design
