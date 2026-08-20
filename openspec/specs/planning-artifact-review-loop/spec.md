# Planning Artifact Review Loop Specification

## Purpose

TBD — placeholder purpose. Define the worker-owned automated artifact review loop for the spec and design planning phases.

## Requirements

### Requirement: supervised-marker-suppresses-automatic-loop

The automatic worker-owned review loop SHALL run if and only if the phase worker's invocation does not carry the supervision marker. The marker is the literal token `--supervised` present on the worker's selected envelope source (the value chosen after existing wrapper-echo precedence over `arguments_value`), consumed by that worker's flag grammar before the verbatim request or change name is finalized.

When the marker is present, the worker SHALL NOT dispatch any automatic isolated reviewer, SHALL NOT advance either automatic-loop counter (the completed-pass count and total-attempt count both remain `0` for the suppressed automatic path), and SHALL proceed to the ordinary pre-gate terminal lifecycle without emitting a `review` progress event from the automatic path. The declared progress plan is not amended: the `review` step remains in the plan. The automatic path supplies no `review` evidence under suppression; a user-requested pass at the prose feedback gate retains its ordinary evidence value per `user-requested-additional-passes`.

When the marker is absent, the automatic loop SHALL behave exactly as this capability defines for the non-suppressed path, including first-pass timing, isolation, caps, and evidence marking. Standalone `/sai-1-spec` and `/sai-2-design` invocations that do not carry the marker SHALL be byte-for-byte unchanged in automatic-loop behavior.

The worker SHALL honor the marker as written and SHALL NOT verify the identity or provenance of its dispatcher. Suppression covers the automatic loop only: a user-requested additional pass at the coordinator-owned prose feedback gate remains available per `user-requested-additional-passes` and is not conditioned on the marker.

The verbatim request that forms the reviewer's reference set (when a pass runs) SHALL be the string with supervision and other recognized flags already stripped; a reviewer SHALL never receive the `--supervised` line.

#### Scenario: marker present suppresses automatic reviewer dispatch

- **WHEN** the spec or design worker's selected envelope source carries the `--supervised` flag under that worker's flag grammar and the phase's pre-completion verification and decision-summary derivation have finished
- **THEN** the worker SHALL dispatch no automatic isolated reviewer
- **AND** it SHALL return its ordinary pre-gate terminal lifecycle without a `review` progress event from the automatic path
- **AND** the `review` step SHALL remain in the declared plan and unmarked by the automatic path

#### Scenario: marker absent preserves today's automatic loop

- **WHEN** the same worker runs without the `--supervised` marker
- **THEN** the automatic review loop SHALL run exactly as this capability requires for the non-suppressed path
- **AND** standalone `/sai-1-spec` and `/sai-2-design` behavior SHALL be unchanged by the existence of the supervised path

#### Scenario: user-requested pass still available under suppression

- **WHEN** the automatic loop was suppressed by the marker and the user later requests another review pass at the prose feedback gate
- **THEN** the worker SHALL run that pass under the same isolation, finding contract, and processing rules
- **AND** neither automatic-loop cap SHALL limit it
- **AND** the marker SHALL NOT block the requested pass

#### Scenario: marker is not provenance-checked

- **WHEN** an invocation carries `--supervised` without having been dispatched by explore's Auto selector
- **THEN** the worker SHALL still suppress the automatic loop
- **AND** it SHALL NOT attempt to verify who dispatched it

#### Scenario: reviewer reference set never includes the marker line

- **WHEN** a review pass runs and the original envelope carried a `--supervised` flag that was stripped before the request was formed
- **THEN** the reference set SHALL contain only the stripped verbatim request
- **AND** the reviewer SHALL NOT receive the `--supervised` line

### Requirement: supervised-flag-prefix-grammar

The supervision marker SHALL travel as flag content inside the existing two-string invocation envelope (`wrapper_echo_value`, `arguments_value`). No third envelope field SHALL be introduced. Boot adapters SHALL remain untouched.

For Auto-supervised explore dispatches, explore SHALL leave `wrapper_echo_value` empty so `arguments_value` remains the selected source, SHALL place the marker and the phase request or change name on that `arguments_value`, and SHALL NOT supply the marker as a bare non-empty `wrapper_echo_value` that would supersede and discard a crystallized request body under wrapper-echo precedence.

Phase grammars differ and SHALL NOT be collapsed into one ordering rule:

- The **spec-proposal worker** SHALL gain a minimal leading recognized-flag grammar that is purely line-wise. On this change the only recognized leading flag line is a line whose trimmed content equals exactly the bare string `--supervised` (no value). Parsing walks the selected source from the start and repeatedly strips each leading line whose trimmed content is exactly `--supervised`. The first line that is not such a line opens the verbatim request (that line is the first line of the request, inclusive); from that point on, no further flag parsing occurs, so a later line or substring `--supervised` inside the request body is request content, not a flag. If after stripping only flag lines the remaining request is empty or whitespace-only, the worker SHALL fail validation before change resolution (empty request). For Auto-supervised sai-1, explore SHALL serialize `arguments_value` as the single line `--supervised`, then a newline, then the complete `Ready to Propose` block bytes.
- The **design worker** SHALL recognize `--supervised` through its existing flag surface alongside `--fast-track` and `--overview-lang <language>`, without requiring the token to be the first token of `arguments_value`. A change-consuming design invocation keeps the change name before options; flags may appear after the name in either order among themselves, matching today's `--fast-track` / `--overview-lang` handling. The canonical Auto design shape remains `{name} --fast-track --supervised` with optional `--overview-lang {overview_language}`. The design worker SHALL NOT persist the marker.

A malformed envelope that the worker cannot parse under its declared grammar SHALL fail under the worker's existing validation failure path before change resolution where the design worker already fails flag validation; the bare `--supervised` token requires no value and is never value-shaped.

#### Scenario: envelope stays two strings

- **WHEN** explore or any other dispatcher forwards a supervised invocation
- **THEN** the worker still receives exactly `wrapper_echo_value` and `arguments_value`
- **AND** no third envelope field carries the marker

#### Scenario: explore Auto leaves wrapper echo empty

- **WHEN** explore constructs an Auto-supervised spec or design dispatch
- **THEN** `wrapper_echo_value` SHALL be empty
- **AND** `arguments_value` SHALL be the selected source carrying both the marker and the phase request or change name
- **AND** the marker SHALL NOT be supplied as a bare non-empty echo value

#### Scenario: spec worker first non-flag line opens the verbatim request

- **WHEN** the spec worker's selected source is the line `--supervised`, a newline, then the crystallized request body
- **THEN** the worker SHALL strip only that leading flag line
- **AND** the first non-flag line SHALL open the verbatim request inclusive of that line
- **AND** nothing after that opening SHALL be parsed as a flag

#### Scenario: later supervised token inside the request is not a flag

- **WHEN** the crystallized request body itself contains the characters `--supervised` after the opening non-flag line
- **THEN** that occurrence SHALL remain part of the verbatim request
- **AND** it SHALL NOT be consumed as a flag

#### Scenario: empty request after flag strip fails validation

- **WHEN** the spec worker's selected source is only the line `--supervised` with no remaining non-whitespace request body
- **THEN** the spec worker SHALL fail validation before change resolution

#### Scenario: design worker accepts name-first flag placement

- **WHEN** the design worker's selected source is `{name} --fast-track --supervised` or the same tokens with `--overview-lang {language}` included
- **THEN** the design worker SHALL recognize `--supervised` without requiring it to be the first token
- **AND** the resolved change name SHALL remain `{name}`
- **AND** the automatic review loop SHALL be suppressed

### Requirement: worker-owned-review-pass

The spec-proposal worker and the design worker SHALL each own an automated artifact review of the artifacts their own phase just wrote, subject to `supervised-marker-suppresses-automatic-loop`. A **review pass** is one complete unit: exactly one reviewer run plus the worker's processing of every finding that run returns. Per-finding processing SHALL NOT increment the pass count.

The pass's **reviewed set** — the artifacts it judges and the only artifacts its findings may target — SHALL be, for the spec phase, `proposal.md` and every `specs/**/*.md` of the resolved change; and for the design phase, `design.md`, `tasks.md`, and `interfaces.md` of the resolved change. The reviewer additionally receives a read-only **reference set** as defined by `reviewer-isolation-and-read-only-input`.

When the supervision marker is absent, the first automatic pass SHALL run only after the phase's own pre-completion verification and decision-summary derivation have finished, and before the worker returns its terminal `completed` payload. The review pass is therefore strictly the last act of the phase's forward sequence on the non-suppressed path, which is why `review` is the plan step that follows `validation` in the spec plan and `interfaces` in the design plan.

Concretely: when not suppressed, the spec worker SHALL run its first pass only after `proposal.md` is non-empty, at least one non-empty `specs/**/*.md` exists, and artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation are complete — that is, after the `validation` progress event. When not suppressed, the design worker SHALL run its first pass only after `design.md`, `tasks.md`, and `interfaces.md` verify successfully and its decision summary has been derived — that is, after the `interfaces` progress event — and before the coordinator's feedback gate and before overview generation.

When the supervision marker is present, the automatic first pass SHALL NOT run; the phase still completes its verification and decision-summary derivation and proceeds to the ordinary pre-gate terminal without automatic reviewer dispatch.

Every completed pass SHALL close with the base-form severity tally single-sourced in `sai/policies/artifact-review-contract.md`.

#### Scenario: spec worker runs a pass before completing when not supervised

- **WHEN** the spec worker has written a non-empty `proposal.md` and at least one non-empty `specs/**/*.md` and the invocation does not carry `--supervised`
- **THEN** it SHALL run a review pass over exactly that artifact set before returning `completed`

#### Scenario: validation precedes review in the spec phase when not supervised

- **WHEN** the spec worker runs its first automatic review pass
- **THEN** artifact verification, the self-consistency and source-grounding checks, and decision-summary derivation SHALL already be complete
- **AND** the `validation` progress event SHALL already have been emitted, so any `review` event necessarily follows it

#### Scenario: interfaces precedes review in the design phase when not supervised

- **WHEN** the design worker runs its first automatic review pass
- **THEN** `design.md`, `tasks.md`, and `interfaces.md` SHALL already have verified successfully and the design decision summary SHALL already have been derived
- **AND** the `interfaces` progress event SHALL already have been emitted, so any `review` event necessarily follows it

#### Scenario: design worker runs a pass before completing when not supervised

- **WHEN** the design worker has written and verified `design.md`, `tasks.md`, and `interfaces.md` and the invocation does not carry `--supervised`
- **THEN** it SHALL run a review pass over exactly those three artifacts before returning `completed`
- **AND** the pass SHALL run before the coordinator's feedback gate and before overview generation

#### Scenario: per-finding processing does not count as a pass

- **WHEN** a single reviewer run returns several findings and the worker processes them one at a time
- **THEN** the whole reviewer run plus all of that processing SHALL count as exactly one pass

#### Scenario: supervised invocation skips the automatic first pass

- **WHEN** the spec or design worker finishes pre-completion verification under a `--supervised` invocation
- **THEN** it SHALL NOT run an automatic review pass before returning `completed`
- **AND** the `review` step SHALL remain unmarked by the automatic path

### Requirement: reviewer-isolation-and-read-only-input

Each pass SHALL create one fresh reviewer, independent of the routed lifecycle, of the worker's own session, and of every prior reviewer.

A reviewer's input SHALL consist of exactly two parts, both freshly read from disk (or taken verbatim from the invocation envelope) in their current state at the start of that pass:

- the **reviewed set** — the artifacts the pass judges, as defined by `worker-owned-review-pass`; and
- the **reference set** — read-only intent and constraint context that the reviewer judges the reviewed set against but never reports findings on.

The reference set SHALL be, for the spec phase, the verbatim resolved request the worker received in its invocation envelope (for a supervised run, the complete `Ready to Propose` block), or **empty** when the envelope carried only a change name; and, for the design phase, the change's `proposal.md` and every `specs/**/*.md`, freshly read.

Admitting verbatim envelope text into the spec-phase reference set is an authorized decision. The resolved request is not "the conversation" for the purposes of this requirement: it is the invocation's own closed input — one of the two strings the worker itself received — fixed before the run began, carrying no turn history, no user or worker reasoning, and no later answers. The prohibition below continues to exclude the surrounding conversation, every subsequent turn, and the worker's own deliberation.

The reviewer SHALL NOT receive anything else: not the conversation, the worker's reasoning or journal, prior reviewer state, lifecycle bindings, continuation references, binding dispatch metadata, or unrelated repository content.

The reviewer SHALL be strictly read-only: it SHALL NOT create, modify, or delete any file, and it SHALL NOT be granted write capability. Every artifact edit arising from a finding SHALL be made by the phase worker.

The reviewer SHALL evaluate artifact-to-artifact consistency across the reviewed set, testability of requirements and scenarios, and unsupported assumptions. When the reference set is non-empty it SHALL additionally evaluate coverage of that set's intent and constraints by the reviewed set.

When the reference set is empty, the intent-coverage axis SHALL NOT apply and its absence SHALL NOT downgrade the pass: such a pass is a full completed pass on its remaining axes, it increments the completed-pass count, and it supplies the same marking evidence as any other completed pass. It SHALL mark `review` when it reports `High=0`, per `review-step-evidence-marking`.

Every finding's artifact location SHALL name a file of the reviewed set; a reviewer SHALL NOT report a finding against a reference-set file, because that file is not the artifact this phase is authoring.

#### Scenario: each pass gets a new reviewer

- **WHEN** a second or third pass runs
- **THEN** the worker SHALL create a fresh reviewer rather than continuing the previous one
- **AND** the new reviewer SHALL receive no state from any prior reviewer

#### Scenario: artifacts are re-read for every pass

- **WHEN** a pass begins after the worker accepted edits from an earlier pass
- **THEN** the reviewer SHALL receive both the reviewed set and the reference set as freshly read at the start of that pass, in their current state

#### Scenario: spec pass input set

- **WHEN** a spec-phase reviewer is created
- **THEN** its reviewed set SHALL be `proposal.md` plus every `specs/**/*.md` of the resolved change
- **AND** its reference set SHALL be the verbatim resolved request from the invocation envelope, or empty when the envelope carried only a change name

#### Scenario: design pass input set

- **WHEN** a design-phase reviewer is created
- **THEN** its reviewed set SHALL be `design.md`, `tasks.md`, and `interfaces.md` of the resolved change
- **AND** its reference set SHALL be that change's `proposal.md` and every `specs/**/*.md`, freshly read

#### Scenario: an invocation carrying only a change name

- **WHEN** `/sai-1-spec my-change` is invoked with no request text, so the spec-phase reference set is empty
- **THEN** the reviewer SHALL evaluate artifact-to-artifact consistency, testability, and unsupported assumptions, and SHALL NOT be required to evaluate intent coverage
- **AND** the resulting pass SHALL be a full completed pass that increments the completed-pass count
- **AND** it SHALL mark `review` when it reports `High=0`

#### Scenario: design coverage of an approved requirement is reviewable

- **WHEN** a design-phase reviewer finds that `design.md` and `tasks.md` leave a requirement of the change's `specs/**` uncovered
- **THEN** it SHALL be able to report that as a finding, because the reference set supplies the requirement
- **AND** the finding's artifact location SHALL name `design.md` or `tasks.md`, never the spec file

#### Scenario: reviewer receives no worker reasoning

- **WHEN** a reviewer is created
- **THEN** its input SHALL exclude the conversation, the worker's reasoning and journal, and any continuation or binding metadata

#### Scenario: reviewer writes nothing

- **WHEN** a reviewer identifies a correction
- **THEN** it SHALL return that correction as a finding and SHALL NOT edit any file

### Requirement: findings-follow-the-shared-contract

Every finding a reviewer returns SHALL conform to the shared artifact review finding contract single-sourced in `sai/policies/artifact-review-contract.md`: the five ordered fields, the closed `High` / `Medium` / `Low` severity vocabulary and its assignment criteria, the severity-prefixed review-scoped identifier scheme, and the base-form summary tally. This capability SHALL reuse that contract by reference and SHALL NOT restate the severity criteria, the finding shape, the identifier scheme, or the tally form.

Findings SHALL be processed by the phase worker under its existing per-item feedback rules in `sai/policies/artifact-feedback-gate.md`, in full and without exception: each item is evaluated independently for legitimacy, legitimate items are applied within the phase's artifact-only scope, every discarded item is reported with the specific reason it was not applied, and the step's decision summary is recomputed from the updated artifacts.

A pass that accepted at least one edit SHALL therefore re-run the phase's pre-completion artifact verification and recompute the decision summary before the run closes, so the summary the coordinator prints always traces to the artifacts as they stand. A pass that accepted no edit SHALL require neither. This re-verification SHALL NOT re-open, revert, or re-report the already-marked `validation` step (spec phase) or the already-marked artifact-writing steps (design phase), and SHALL NOT emit a progress event carrying those ids, because marks are monotonic per `review-step-evidence-marking`.

#### Scenario: an accepted finding forces re-verification and a fresh summary

- **WHEN** the worker accepts at least one finding and edits an artifact
- **THEN** it SHALL re-run the phase's pre-completion artifact verification and recompute the decision summary from the updated artifacts before the run closes

#### Scenario: re-verification does not re-open an earlier step

- **WHEN** re-verification runs after a review-driven edit and the `validation` step is already marked
- **THEN** `validation` SHALL remain marked
- **AND** no progress event carrying `validation` SHALL be emitted

#### Scenario: a pass that changed nothing needs no recomputation

- **WHEN** a completed pass discards every finding, or returns none
- **THEN** no re-verification and no summary recomputation SHALL be required

#### Scenario: a finding carries the contract's fields

- **WHEN** a reviewer returns a finding
- **THEN** it SHALL carry the identifier, severity, artifact location, issue statement, and recommended correction defined by the shared contract

#### Scenario: findings are applied only within artifact-only scope

- **WHEN** the worker accepts a finding
- **THEN** it SHALL edit only the artifacts of the reviewed set
- **AND** it SHALL NOT write project source, configuration, or any file outside that set

#### Scenario: a discarded finding is reported with a reason

- **WHEN** the worker judges a finding illegitimate
- **THEN** it SHALL report the finding and the specific reason it was not applied

### Requirement: automatic-loop-caps

The automatic review loop — and only the automatic review loop on the non-suppressed path — SHALL be governed by exactly two counters, which SHALL be named distinctly wherever they appear and SHALL NOT be referred to by a single shared word:

- the **completed-pass count** — capped at 3. It SHALL be incremented only by a completed pass, meaning one whose reviewer returned a valid finding set under the shared contract, including an empty one.
- the **total-attempt count** — capped at 6, twice the completed-pass cap. It SHALL be incremented by every reviewer dispatch, whether that dispatch completed or not.

These counters SHALL NOT advance while the automatic loop is suppressed by the supervision marker. User-requested additional passes SHALL NOT advance either counter.

A completed pass reporting `High=0` SHALL end the automatic loop as converged. A completed pass reporting at least one `High` finding SHALL cause another automatic dispatch while both caps still permit one. `Medium` and `Low` findings SHALL be processed and reported but SHALL NOT cause another dispatch.

An attempt whose reviewer fails, is cancelled, or violates the severity contract SHALL increment the total-attempt count only, SHALL NOT increment the completed-pass count, and SHALL NOT end the automatic loop: the worker SHALL dispatch a fresh reviewer and retry while the total-attempt cap permits.

When the automatic loop runs and the phase worker itself does not return `failed` or `cancelled` while processing a pass, the automatic loop SHALL end in exactly one of three ways:

- **convergence** — a completed pass reports `High=0`;
- **completed-pass-cap exhaustion** — the completed-pass count reaches 3 with `High` findings outstanding. This is a non-failure outcome: the worker processes every finding of the final pass, dispatches no further automatic reviewer, and closes the run `completed` with the outstanding findings and dispositions reported;
- **total-attempt-cap exhaustion** — the total-attempt count reaches 6 without convergence and without the completed-pass cap being reached. This is also a non-failure outcome: `review` stays unmarked, and the report SHALL identify total-attempt-cap exhaustion, enumerate reviewer failure, cancellation, or contract-violation causes, and report any outstanding `High` findings separately rather than conflating them with reviewer failures.

Those three endings describe automatic-loop outcomes only. If the phase worker returns `failed` or `cancelled` while processing findings of an automatic pass, the run SHALL close with that ordinary worker terminal under the shared lifecycle contracts; that path is not an automatic-loop ending, advances neither counter beyond the attempt already counted for the reviewer dispatch that produced the findings being processed, and fabricates no convergence. Reviewer failure, cancellation, and severity-contract violation remain distinct from worker failure during finding processing and continue to follow the retry rules above while the total-attempt cap permits.

When the automatic loop is suppressed, none of the three automatic-loop endings apply: the worker simply does not enter the loop.

#### Scenario: a High finding causes another automatic dispatch

- **WHEN** a completed pass reports at least one `High` finding, the completed-pass count is below 3, and the total-attempt count is below 6
- **THEN** the worker SHALL dispatch another automatic reviewer over the resulting artifacts

#### Scenario: a no-High pass ends the automatic loop

- **WHEN** a completed pass reports `High=0`
- **THEN** the worker SHALL dispatch no further automatic reviewer, and the loop SHALL end as converged

#### Scenario: Medium and Low findings never extend the loop

- **WHEN** a completed pass reports `Medium` or `Low` findings but no `High` finding
- **THEN** those findings SHALL be processed and reported
- **AND** the worker SHALL dispatch no further automatic reviewer

#### Scenario: a failed attempt is retried and does not advance the completed-pass count

- **WHEN** the first automatic dispatch's reviewer fails, is cancelled, or violates the severity contract
- **THEN** the total-attempt count SHALL be 1 and the completed-pass count SHALL be 0
- **AND** the worker SHALL dispatch a fresh reviewer rather than ending the automatic loop

#### Scenario: completed-pass-cap exhaustion is not a failure

- **WHEN** the third completed pass still reports at least one `High` finding
- **THEN** the worker SHALL dispatch no further automatic reviewer
- **AND** the run SHALL close `completed` with those findings and dispositions reported

#### Scenario: total-attempt-cap exhaustion is not a failure

- **WHEN** six reviewer dispatches have been made and the loop has neither converged nor reached three completed passes
- **THEN** the worker SHALL dispatch no further automatic reviewer
- **AND** `review` SHALL remain unmarked
- **AND** total-attempt-cap exhaustion and every reviewer failure, cancellation, or contract violation SHALL be reported distinctly from any outstanding `High` findings

#### Scenario: the two counters are never conflated

- **WHEN** the loop's limits are described in any surface
- **THEN** the completed-pass count and the total-attempt count SHALL each be named explicitly
- **AND** no single word SHALL be used to denote both

#### Scenario: suppressed automatic path advances neither counter

- **WHEN** the supervision marker suppresses the automatic loop for an entire phase
- **THEN** the completed-pass count and the total-attempt count SHALL both remain 0 for that automatic path
- **AND** no automatic-loop ending SHALL be claimed

#### Scenario: worker failure during finding processing is not an automatic-loop ending

- **WHEN** the phase worker returns `failed` or `cancelled` while processing findings from a valid automatic-pass reviewer result
- **THEN** the run SHALL close with that worker terminal
- **AND** the outcome SHALL NOT be reported as convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion
- **AND** no further automatic reviewer SHALL be dispatched after that terminal

### Requirement: user-requested-additional-passes

Once the automatic loop has ended — by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion — or once the automatic loop was suppressed by the supervision marker without running, the user MAY request further review passes without limit through the coordinator-owned prose feedback gate defined by `sai/policies/artifact-feedback-gate.md`. User-requested passes SHALL be subject to neither the completed-pass cap nor the total-attempt cap, which govern only the non-suppressed automatic loop. A pass requested that way SHALL follow this capability's pass definition, isolation, and finding contract unchanged, and SHALL be indistinguishable from an automatic pass in its evidence value. The supervision marker SHALL NOT condition, block, or cap a user-requested pass.

Requesting a pass SHALL NOT change the ownership, picker, labels, or iteration counter of the feedback gate: the coordinator continues to own the gate and forwards only the supplied feedback text to the same worker.

#### Scenario: the user asks for another pass after an automatic cap ends the loop

- **WHEN** the user supplies feedback at the gate asking for another review pass
- **THEN** the worker SHALL run a further pass under the same rules
- **AND** neither the completed-pass cap nor the total-attempt cap SHALL limit how many such passes the user may request

#### Scenario: the gate is unchanged

- **WHEN** a user-requested pass runs
- **THEN** the feedback gate's picker, option labels, iteration counter, and ownership SHALL remain exactly as `sai/policies/artifact-feedback-gate.md` defines them

#### Scenario: user-requested pass after supervised suppression

- **WHEN** the automatic loop was suppressed by `--supervised` and the user requests a review pass at the prose feedback gate
- **THEN** the worker SHALL run the pass
- **AND** the marker SHALL NOT prevent, cap, or reclassify that pass

### Requirement: a-failed-attempt-completes-no-pass-and-is-retried

A reviewer that fails, is cancelled, or returns a finding whose severity is missing or outside the closed `High` / `Medium` / `Low` set SHALL NOT produce a completed pass: no finding from that attempt SHALL be processed, no severity SHALL be coerced to a default, and the attempt SHALL produce no marking evidence, so it can neither mark nor clear the `review` step.

Such an attempt SHALL increment the total-attempt count only and SHALL leave the completed-pass count unchanged, per `automatic-loop-caps`. It SHALL NOT end the automatic loop: the worker SHALL dispatch a fresh reviewer and retry while the total-attempt cap permits. The worker SHALL NOT reuse the failed reviewer or carry any of its state into the retry.

The worker SHALL report such an outcome distinctly from a completed pass that carries `High` findings, naming the cause as a reviewer failure, a reviewer cancellation, or a reviewer output-contract violation; for a contract violation it SHALL preserve the offending finding's reviewer-supplied identifier and the verbatim offending severity value or `missing`. The worker SHALL NOT repair the artifacts on the reviewer's behalf and SHALL NOT fabricate findings.

A failed, cancelled, or contract-violating attempt SHALL NOT prevent the run from closing: the artifacts remain available and the coordinator's feedback gate is still presented.

#### Scenario: reviewer fails or is cancelled

- **WHEN** a reviewer returns a failure or cancellation
- **THEN** the worker SHALL report that the attempt did not complete a pass and SHALL process no finding from it
- **AND** the total-attempt count SHALL advance while the completed-pass count SHALL NOT
- **AND** the worker SHALL dispatch a fresh reviewer while the total-attempt cap permits
- **AND** the run SHALL still close through its ordinary terminal lifecycle status

#### Scenario: reviewer violates the severity contract

- **WHEN** a reviewer returns a finding whose severity is missing or outside `High`, `Medium`, or `Low`
- **THEN** the worker SHALL reject the whole attempt, process no finding from it, and coerce no default severity
- **AND** it SHALL report the cause as a reviewer output-contract violation, preserving the reviewer-supplied identifier and the verbatim offending value or `missing`

#### Scenario: a failed attempt is distinguishable from outstanding High findings

- **WHEN** the worker reports the review outcome
- **THEN** a reviewer failure, cancellation, or contract violation SHALL be reported distinctly from a completed pass carrying `High` findings

### Requirement: the-shared-contract-enumerates-this-surface

`sai/policies/artifact-review-contract.md` opens by enumerating the artifact review surfaces bound by the contract. Because the automatic worker-owned planning review loop is one such surface and is now conditional on the absence of the supervision marker, that enumeration SHALL name the automatic worker-owned loop as a conditional surface rather than an unconditional always-on surface, so the policy does not describe its own reach inaccurately. The enumeration's conditionality applies to the automatic loop only; user-requested worker-owned passes at the prose feedback gate remain a bound surface even when the marker is present.

The edit SHALL be confined to the enumeration. The severity vocabulary and assignment criteria, the finding shape, the identifier scheme, and the summary tally form SHALL remain byte-for-byte unchanged, and the `review-finding-format` capability that owns them normatively SHALL NOT be modified.

#### Scenario: the enumeration names the automatic worker-owned loop as conditional

- **WHEN** `sai/policies/artifact-review-contract.md` is read after this change
- **THEN** its surface enumeration SHALL name the automatic worker-owned planning review loop as conditional on the absence of the supervision marker
- **AND** it SHALL still name the manual `sai-explore` post-crystallization review loop and the supervised pipeline's in-session review rounds
- **AND** the conditionality SHALL NOT be read to exclude user-requested worker-owned passes under the marker

#### Scenario: the contract's normative body is untouched

- **WHEN** the amended policy is compared with its prior text
- **THEN** the only difference SHALL be the surface enumeration
- **AND** the severity criteria, finding shape, identifier scheme, and tally form SHALL be unchanged

### Requirement: coexistence-with-existing-review-surfaces

The worker-owned review loop SHALL NOT replace the coordinator-owned prose feedback gate or the supervised pipeline's own in-session review rounds.

On the non-supervised path (marker absent), the worker-owned automatic loop remains the phase's automatic convergence mechanism and coexists with the prose feedback gate exactly as before.

On the selector-dispatched supervised path (marker present), explore's in-session review rounds (`supervised-review-in-session`, `supervised-review-rounds`, `supervised-review-reporting`) are the sole automatic review: the worker-owned automatic loop SHALL NOT run in addition to them. Duplication of automatic review layers under supervision is no longer an accepted trade-off. Per phase, the worst case under supervision is the supervised layer running at most 3 in-session rounds over that phase's artifacts; the worker-owned layer contributes zero automatic reviewer dispatches. Because design chaining proceeds on every non-`failed`/`cancelled` spec ending — convergence and cap exhaustion alike — a full supervised run spanning both phases carries that supervised worst case twice, once for the spec phase's artifacts and once for the design phase's.

Because the supervised flow declares no progress plan, no list renders there and step marking has no application. The worker still emits its non-review progress events per the coordinator contract's plan-independent obligations; under suppression it simply does not emit a `review` event from the automatic path.

The worker-owned loop SHALL NOT use, alter, or depend on the `MachineFeedbackAdapter` of `sai/policies/artifact-feedback-gate.md`, which remains owned by the supervised pipeline.

When the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under an interactive fetch site (standalone `/sai-1-spec` or `/sai-2-design`, `mode` omitted or `interactive`), the coordinator SHALL still present the prose feedback gate at iteration 0, unchanged. When that loop ends under a supervised fetch site (`mode = supervised`), the coordinator SHALL NOT present the prose feedback gate at iteration 0; the supervised gate application point SHALL auto-proceed per `artifact-feedback-gate` instead.

With the worker-owned automatic layer absent under supervision, a failed or cancelled worker during an in-session round stops the run under that terminal; no automatic reviewer-retry safety net absorbs the failure and no substitute convergence is fabricated.

#### Scenario: the prose feedback gate still runs interactively

- **WHEN** the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under an interactive fetch site
- **THEN** the coordinator SHALL still present the prose feedback gate at iteration 0, unchanged

#### Scenario: supervised ending auto-proceeds without iteration-0 presentation

- **WHEN** the worker-owned automatic loop ends by convergence, completed-pass-cap exhaustion, or total-attempt-cap exhaustion under a supervised fetch site (`mode = supervised`)
- **THEN** the coordinator SHALL NOT present the prose feedback gate at iteration 0
- **AND** the supervised gate application point auto-proceeds per the shared gate's supervised rules

#### Scenario: under supervision only in-session rounds run automatically

- **WHEN** the spec worker runs under selector-dispatched supervision with the `--supervised` marker
- **THEN** explore's in-session review rounds SHALL run in the explore session through the Review Engine
- **AND** the worker-owned automatic pass SHALL NOT run in addition to them

#### Scenario: non-supervised path keeps the worker-owned automatic loop

- **WHEN** the spec or design worker runs without the supervision marker
- **THEN** the worker-owned automatic loop SHALL still run
- **AND** no supervised in-session round is required by this capability

#### Scenario: marking has no application under supervision

- **WHEN** a supervised worker emits progress events under the supervised flow
- **THEN** each event's `changed_files` SHALL still join the supervision report and the worker SHALL still be continued with `continue_after_progress`
- **AND** no list SHALL render and no step SHALL be marked, because no adapter-declared plan is in force
- **AND** the automatic path SHALL supply no `review` evidence when the automatic loop was suppressed

#### Scenario: no reviewer-retry safety net under supervision

- **WHEN** the phase worker returns `failed` or `cancelled` during a supervised in-session round while the automatic worker-owned loop is suppressed
- **THEN** the run SHALL stop under that terminal
- **AND** no automatic worker-owned reviewer dispatch SHALL absorb the failure or fabricate convergence
