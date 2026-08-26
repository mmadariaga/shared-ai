# pipeline-design-phase-chaining Specification

## Purpose

TBD - created by archiving change extend-pipeline-supervision-to-sai-2. Update Purpose after archive.
## Requirements

### Requirement: Chain design only from Plan

The existing sai-1-to-sai-2 phase transition SHALL belong to Plan (unattended), preserving its active token, supervised gates, review rounds, and design retry behavior.

#### Scenario: Plan chains to design

- **WHEN** supervised sai-1 converges under Plan
- **THEN** the existing design worker is chained without dispatching implementation.
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

The chained design phase SHALL subject the design worker's generated artifacts — `design.md`, `tasks.md`, and `interfaces.md` — to bounded in-session review rounds that mirror the spec phase but are owned by this capability for the design worker and design artifacts. Each round SHALL be performed by the explore coordinator itself through the review engine per the `supervised-review-in-session` capability, invoked with the change name and the `sai-2` artifact-set designator, and SHALL form findings only from that round's fresh engine reread of the design artifacts in their current state. No reviewer subagent SHALL be dispatched for any design round. The rounds SHALL evaluate design-to-spec consistency, coverage of the specs' requirements and the crystallized intent, feasibility and testability of the planned tasks, and unsupported assumptions, and SHALL return findings under the closed `High`/`Medium`/`Low` severity contract defined by the `pipeline-review-severity` capability. Every actionable finding SHALL be processed through the design-phase machine-feedback adapter defined below against the same design worker continuation; the design worker SHALL retain exclusive ownership of every design-artifact edit and per-finding legitimacy evaluation, and pipeline supervision SHALL NOT edit design artifacts or silently suppress findings. A completed round containing at least one `High` finding SHALL cause another design round while the design phase's three-round cap still permits one; when the third completed design round still contains at least one `High` finding, the design bound closes as non-failure cap exhaustion. A completed round containing no `High` finding SHALL declare design-phase convergence, with `Medium` and `Low` findings processed and visible but non-blocking. The design loop SHALL run at most three review rounds per Auto attempt — a cap of the same size the spec phase uses — counted under the design phase's own counter, with the counting rule owned by the `supervised-review-rounds` capability rather than restated here.

The design phase has a separate budget of at most three rounds per phase per Auto attempt. A fresh `High` finding extends the design sequence while that attempt's three-round budget permits; the budget resets to zero for a new Auto attempt and is independent of the spec phase's budget.

#### Scenario: design artifacts are reviewed after generation
- **WHEN** the chained design worker has produced `design.md`, `tasks.md`, and `interfaces.md`
- **THEN** the pipeline runs in-session review rounds over those design artifacts through the engine
- **AND** a completed round containing a `High` finding causes a further round while the three-round design cap permits, and closes the bound as cap exhaustion only after the third completed round still contains a `High` finding
- **AND** it declares design-phase convergence when a completed round contains no `High` finding

#### Scenario: design review uses a three-round cap of the same size as the spec phase
- **WHEN** the design review loop runs
- **THEN** it runs at most three review rounds for the design phase per Auto attempt, counted under the design phase's own counter per the `supervised-review-rounds` capability
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

The chained design phase SHALL own a machine-feedback adapter that continues each completed design round's structured findings to the same design worker, rather than reusing the sai-1 machine-feedback adapter. For every completed round the adapter SHALL apply the shared artifact-feedback-gate's canonical per-item semantics — per-item split, legitimacy judgment, artifact-only edits confined to `design.md`, `tasks.md`, and `interfaces.md`, specific discard reasons, and design-summary recomputation — reusing those single-sourced semantics without restating them. Machine-feedback processing SHALL not present the user gate, emit the empty-turn prompt, increment the iteration counter, or execute the proceed branch. The design-phase fetch SHALL supply `artifacts = design.md, tasks.md, interfaces.md`, `proceed-label = Continue`, and `mode = supervised`.

After the design rounds converge or exhaust their cap, the deferred gate SHALL branch on the same explicit overview opt-in used by the design adapter. With `--overview-lang <language>`, it SHALL execute the existing post-gate overview-generation action exactly once using the current invocation's language. Without the flag, it SHALL execute a no-generation design terminal exactly once, with no overview progress step or overview-state write caused by the skip. The user-facing gate remains deferred in supervised mode; direct `/sai-2-design` remains interactive when it omits supervised mode, while its Continue route still follows the flag-presence rule.

#### Scenario: Design machine findings continue to the design worker

- **WHEN** a completed design review round returns one or more structured findings
- **THEN** the design-phase adapter continues each finding to the same design worker
- **AND** accepted edits stay within `design.md`, `tasks.md`, and `interfaces.md`
- **AND** every discarded finding is reported with its specific reason

#### Scenario: User design gate is deferred while the round is processed

- **WHEN** a design round's machine-feedback processing is still in progress
- **THEN** processing completes without presenting or advancing the user-facing design gate
- **AND** the iteration counter remains `0`

#### Scenario: Opted-in supervised convergence continues to overview

- **WHEN** an opted-in supervised design review round converges after machine-feedback processing
- **THEN** the design artifact gate is not presented
- **AND** the iteration counter remains `0`
- **AND** the gate executes the overview-generation action exactly once with the selected language

#### Scenario: Opted-in supervised cap exhaustion continues to overview

- **WHEN** an opted-in supervised design review exhausts its three-round cap after applying findings
- **THEN** cap exhaustion remains a non-failure outcome
- **AND** the gate executes the overview-generation action exactly once

#### Scenario: Unopted-in supervised convergence skips overview

- **WHEN** a supervised design review converges and the invocation contains no `--overview-lang`
- **THEN** the design artifact gate is not presented
- **AND** no overview generator is dispatched and no overview progress event is emitted
- **AND** the no-generation design terminal closes the phase

#### Scenario: Unopted-in empty findings skip overview

- **WHEN** an unopted-in supervised design review round returns an empty findings array
- **THEN** no artifact edit is made by the machine-feedback adapter
- **AND** the design artifact gate is not presented
- **AND** the no-generation design terminal executes exactly once

#### Scenario: Interactive design gate remains for direct sai-2

- **WHEN** `/sai-2-design` is invoked directly and its coordinator fetches the shared gate without supplying `mode`
- **THEN** after design convergence or cap exhaustion the user-facing design feedback gate is presented at iteration `0`
- **AND** it names `design.md`, `tasks.md`, and `interfaces.md` with proceed-label `Continue`
- **AND** the first option remains `Give feedback (Recommended)`

#### Scenario: design machine findings continue to the design worker
- **WHEN** a completed design review round returns structured findings
- **THEN** the design-phase adapter continues each finding to the same design worker

#### Scenario: user design gate is deferred while the round is processed
- **WHEN** machine-feedback processing is still in progress
- **THEN** processing completes without presenting the user-facing design gate and the iteration counter remains `0`

#### Scenario: supervised design convergence auto-continues to overview generation
- **WHEN** a supervised design review converges after machine-feedback processing
- **THEN** the gate executes overview generation exactly once

#### Scenario: supervised design cap exhaustion auto-continues to overview generation
- **WHEN** a supervised design review exhausts its three-round cap
- **THEN** cap exhaustion remains non-failure and overview generation executes exactly once

#### Scenario: supervised design empty findings auto-continues to overview generation
- **WHEN** a supervised design review returns an empty findings array
- **THEN** no artifact edit is made and the supervised terminal executes without presenting the user gate

#### Scenario: interactive design gate remains for direct sai-2
- **WHEN** `/sai-2-design` is invoked directly without supervised mode
- **THEN** the user-facing design feedback gate is presented at iteration `0`

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

When the chained design phase reaches convergence or cap exhaustion, explore SHALL apply the shared artifact feedback gate with `mode = supervised`. If the invocation explicitly supplied `--overview-lang <language>`, the gate SHALL execute the Continue next-action (overview generation) exactly once; if the flag is absent, it SHALL execute the no-generation design terminal exactly once. These routes are mutually exclusive and exactly one SHALL execute per invocation, selected solely by the active design envelope's flag presence. Explore SHALL then emit design-phase supervised completion at most once, emit the design completion sentence at most once, suppress the standalone `/sai-2-design` navigation sentence for this supervised run, emit exactly one `Next step: run /sai-build {name}.` handoff, emit no `sai-3 was not run.` text, and dispatch no later phase. A failed or cancelled design worker SHALL end the supervised run under its lifecycle result without auto-proceeding either route, leave the change retryable, and keep the existing autonomy reporting behavior.

#### Scenario: Chained opted-in design converges

- **WHEN** an opted-in chained design phase converges after its review rounds and feedback handling
- **THEN** overview generation runs once with the explicit language, explore emits design-phase supervised completion, does not relay the standalone `/sai-2-design` navigation sentence, emits exactly one `Next step: run /sai-build {name}.` handoff, and does not emit `sai-3 was not run.`

#### Scenario: Chained unopted-in design converges

- **WHEN** a chained design phase converges without `--overview-lang`
- **THEN** no overview generator is dispatched and no new overview lifecycle state is written, explore emits design-phase supervised completion and the build handoff, and dispatches no later-phase worker

#### Scenario: Chained unopted-in design exhausts the cap

- **WHEN** an unopted-in chained design phase exhausts its three-round cap
- **THEN** cap exhaustion remains a non-failure outcome, the build handoff is emitted, and the no-generation design terminal closes the phase without an overview progress step or later-phase dispatch

#### Scenario: Chained design converges

- **WHEN** the chained design phase reaches convergence after its review rounds
- **THEN** explore emits design-phase supervised completion, emits the build handoff, and does not relay the standalone navigation sentence

#### Scenario: Chained design exhausts the cap

- **WHEN** the chained design phase exhausts its three-round cap
- **THEN** cap exhaustion remains a non-failure outcome, the build handoff is emitted, and the phase closes

#### Scenario: No later phase is ever chained

- **WHEN** the chained design phase reaches any terminal outcome
- **THEN** the supervised run never dispatches implementation or any phase after design
