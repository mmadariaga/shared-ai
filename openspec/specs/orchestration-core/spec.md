# orchestration-core Specification

## Purpose
TBD - created by archiving change extract-sai-orchestration-core. Update Purpose after archive.
## Requirements
### Requirement: Planning adapters inspect artifacts only for non-clean closure

The shared orchestration contract SHALL define the diagnosis boundary for opted-in standalone planning adapters. After resolution, a `failed` result of any worker class, a `completed` result disproven by coordinator verification, or a `completed` result carrying a STOP SHALL be a non-clean closure. Only that route may authorize the active coordinator to read the phase-owned artifacts needed to establish cause. A clean `completed` result, `needs_input`, `cancelled`, progress event, notice, and every pre-resolution result SHALL retain the adapter's existing artifact-blind routing behavior. The phase adapter SHALL declare the worker-owned artifact surface and whether a diagnosed correction is a same-worker re-dispatch; it SHALL not restate the shared diagnosis or budget rules.

#### Scenario: Clean standalone completion remains artifact-blind
- **WHEN** a standalone spec or design coordinator receives a clean result
- **THEN** it SHALL forward and present the result without opening change artifacts
- **AND** it SHALL preserve the existing clean-route blindness clause verbatim in effect

#### Scenario: Failed result opens the diagnosis route
- **WHEN** a resolved standalone planning worker returns a structurally valid `failed` result
- **THEN** the coordinator SHALL enter shared non-clean diagnosis before deciding whether to continue
- **AND** it MAY read only the declared phase-owned artifact surface for that diagnosis

#### Scenario: Disproved completion is diagnosed
- **WHEN** coordinator evidence disproves a `completed` result or a completed result carries a STOP
- **THEN** the coordinator SHALL treat the closure as non-clean and inspect the declared artifact surface
- **AND** it SHALL not mark the phase clean or advance its terminal action before diagnosis resolves

#### Scenario: Non-clean diagnosis remains ephemeral
- **WHEN** a planning coordinator records a diagnosis or starts a same-worker correction
- **THEN** the diagnosis, cause locus, and ledger state SHALL remain coordinator conversation state
- **AND** no diagnosis, repair marker, or recovery counter SHALL be written to an artifact or metadata file

### Requirement: Planning recovery preserves worker ownership

For an eligible in-scope planning diagnosis, the shared runner SHALL re-dispatch the same live worker with the existing bounded-recovery acknowledgement and the coordinator-authored diagnosis. The coordinator SHALL never write or repair the worker-owned proposal, spec, design, task, interface, glossary, or overview artifacts. An out-of-scope or unresolved cause SHALL spend zero recovery slots and SHALL stop through the phase-owned hand-back. The worker remains responsible for applying the correction and verifying the artifacts before returning `completed`.

#### Scenario: An in-scope planning cause continues the same worker
- **WHEN** coordinator artifact inspection identifies a concrete safe correction inside the active worker's declared artifact boundary and the diagnosis key is new
- **THEN** the runner SHALL spend one distinct recovery slot
- **AND** SHALL continue the same worker with the diagnosis
- **AND** SHALL not dispatch a replacement worker

#### Scenario: A prior-phase artifact stops design recovery
- **WHEN** design inspection shows that contradictory `proposal.md` or `specs/**` content is the cause of a design failure
- **THEN** the coordinator SHALL name that prior-phase artifact and concrete point as out of scope
- **AND** SHALL spend zero recovery slots and SHALL not edit the spec artifact

#### Scenario: Coordinator and worker judgments disagree
- **WHEN** a worker reports a correction as safe, `unrecoverable: false`, and coordinator artifact verification disproves that claim
- **THEN** the coordinator's independently verified evidence SHALL control the cause locus and recovery decision
- **AND** the coordinator SHALL not continue solely on the worker's classification or summary

#### Scenario: Coordinator cannot override a worker veto
- **WHEN** a worker returns `unrecoverable: true` and coordinator inspection appears to identify a safe in-scope correction
- **THEN** the coordinator SHALL retain the worker veto as non-overridable
- **AND** SHALL spend zero recovery slots and SHALL not continue the worker

### Requirement: Shared coordinator contract
The canonical orchestration source SHALL define one shared coordinator contract for lifecycle result validation, progress-event handling, changed-file aggregation — including every path reported on progress events, added in first-seen order and never reset by them — same-worker continuation, bounded same-worker recovery, replacement-worker fallback, and terminal result reporting. Routed phase coordinators SHALL apply that contract rather than maintain independent copies of those mechanics. Each routed phase SHALL supply a phase adapter containing its initial worker envelope, binding dispatch and continuation operations, permitted nonterminal extensions and handlers, an optional static ordered progress plan declaration, an optional static `recovery_policy` declaration, replacement-worker reconstruction fields, and terminal navigation action. The shared runner SHALL own the fixed recovery acknowledgement `continue_after_recovery`; it SHALL not be an additional phase-adapter field. Recovery eligibility SHALL be limited by the `Recovery eligibility and worker veto` requirement in the `bounded-worker-recovery` capability, rather than by the mere presence of `recovery_policy`. The adapter SHALL NOT reimplement payload validation, progress marking, changed-file union, recovery budgeting, continuation-first ordering, or fallback control flow. When a supervising invocation declares an ordered sequence of phase adapters, the shared contract SHALL execute that sequence under the three rules of `Chained phase composition`; optional `progress_plan` and `recovery_policy` declarations are immutable for the active adapter segment and are rebound when the next adapter activates. A one-adapter invocation keeps segment scope identical to the pre-composition contract.

#### Scenario: Routed phases use the shared contract
- **WHEN** a routed coordinator receives a worker lifecycle result
- **THEN** it SHALL process the result through the same canonical coordinator contract
- **AND** the shared contract SHALL invoke the phase adapter only at the declared extension points
- **AND** phase-specific navigation SHALL remain in the adapter rather than a duplicated lifecycle loop

### Requirement: Chained phase composition

The shared coordinator contract SHALL permit one invocation to execute an ordered sequence of phase adapters without introducing a new orchestration file or relocating `sai/orchestration/command-runner.md`. The composition SHALL execute adapters strictly in list order, rebind segment fields on activation, scope each recovery ledger to its active segment with a fresh three-slot diagnosis ledger for each eligible segment, preserve the invocation-scoped changed-files union across transitions, and carry the non-clean-closure diagnosis only within the active segment. Each eligible ledger slot SHALL permit one attempt for one new diagnosis key; duplicate detection SHALL apply within the segment. A non-final successful adapter SHALL transition only to the consecutive successor using its authorized envelope; the shared contract SHALL NOT skip ahead to a later list entry, and a supervising composition MAY activate the declared consecutive successor under a declared conditional-activation rule (for example the meta-review triage parse of the regenerated `review.md`) without that rule counting as an undeclared side channel. A failed, cancelled, malformed, or non-clean closure without a successful phase-owned resolution SHALL close the active supervising invocation without advancing. Chained apply SHALL inherit the shared route through its existing apply phase adapter; the build coordinator SHALL not duplicate or replace that route.

#### Scenario: Ordered sequence runs through the shared runner

- **WHEN** a supervising invocation declares two or more phase adapters in order
- **THEN** the shared contract SHALL execute each adapter segment in declaration order and rebind that segment's fields
- **AND** it SHALL preserve the changed-files union across transitions

#### Scenario: Progress events flow through the contract

- **WHEN** a worker returns a nonterminal progress event
- **THEN** the shared contract SHALL mark the reported step ids in the adapter-declared plan and continue the same worker through the binding

#### Scenario: Progress changed files join the union

- **WHEN** a progress event reports changed files
- **THEN** the shared contract SHALL add every reported path to the invocation-scoped union in first-seen order
- **AND** SHALL never reset the union on a progress event

#### Scenario: Recovery flows through the contract

- **WHEN** an adapter declares `recovery_policy` and a worker returns an eligible failed outcome under the `bounded-worker-recovery` capability
- **THEN** the shared contract SHALL announce and budget same-worker recovery
- **AND** SHALL continue the worker with the fixed `continue_after_recovery` acknowledgement
- **AND** SHALL never dispatch a replacement worker from that recovery path

#### Scenario: E10 recovery exhaustion cannot advance a build segment

- **WHEN** an opted-in apply segment exhausts its three-slot diagnosis ledger without a coordinator-verified clean result
- **THEN** the supervising composition SHALL close at the apply segment
- **AND** it SHALL not re-enter implement, skip to a later adapter, or emit successful terminal navigation

#### Scenario: Non-final completion transitions only to the successor

- **WHEN** a non-final adapter completes successfully with an authorized transition and no unresolved non-clean closure
- **THEN** the shared contract SHALL activate only the adapter at position `i + 1`
- **AND** it SHALL not print the non-final adapter's standalone completion, SHALL not skip ahead to a later list entry, and SHALL only apply a declared conditional-activation rule that resolves the consecutive successor

#### Scenario: Segment recovery pools are independent

- **WHEN** two consecutive segments both declare `recovery_policy: true`
- **THEN** each segment SHALL receive its own fresh three-slot diagnosis ledger, with one attempt per new diagnosis key
- **AND** the later segment SHALL not inherit a depleted ledger or a diagnosis from the earlier segment

#### Scenario: Single-phase invocation remains unchanged

- **WHEN** an invocation supplies exactly one phase adapter
- **THEN** shared runner behavior and standalone terminal navigation SHALL match the one-phase contract
- **AND** the new diagnosis route SHALL add no phase-specific prompt, artifact, or lifecycle field unless that adapter opts into it

### Requirement: Separate phase worker contracts
The orchestration source SHALL retain separate design-worker and implementation-worker contracts that layer phase policy over the shared worker lifecycle. The workers SHALL NOT be merged into a conditional all-phase prompt.

#### Scenario: Phase behavior remains isolated
- **WHEN** a design-only or implementation-only rule is authored
- **THEN** it SHALL reside in the corresponding phase worker contract
- **AND** it SHALL NOT alter the other phase's worker behavior

### Requirement: Behavior-preserving extraction

Consuming the shared orchestration contracts SHALL preserve existing command inputs, lifecycle payload fields, terminal statuses, notices, continuation and fallback semantics, changed-file ordering, user gates, artifact writes, and completion messages except for the explicitly bounded recovery routing defined by this change. The extraction SHALL NOT change an OpenSpec artifact schema, add recovery behavior to an adapter that omits `recovery_policy`, or change Explore Auto's delegated-write boundary or Build's composition rules. Standalone spec and design adapters MAY opt into the shared non-clean-closure route; their existing clean path remains artifact-blind and their workers remain the sole artifact writers. Spec and design workers SHALL continue to author their own closed `failure_class` outcomes and worker-side repair evidence; the shared runner SHALL transport routing diagnosis and coordinator evidence without inventing worker fields. Design overview recovery remains available through its existing route, and main planning-artifact recovery is added only through the declared non-clean inspection boundary.

#### Scenario: Existing planning invocation crosses the new seam

- **WHEN** an existing spec or design invocation returns a clean completion, input pause, cancellation, or its phase-defined failed outcome
- **THEN** the lifecycle status, failure fields, artifacts, and navigation SHALL remain governed by its existing phase contract
- **AND** the runner SHALL not introduce an apply-only recovery prompt or edit a planning surface

#### Scenario: Blind design recovery uses the phase-static locus channel

- **WHEN** a design invocation with `recovery_policy: true` returns a valid failed worker result that matches the registered `design-overview-repair` surface in `bounded-worker-recovery` (`unrecoverable: false` and an accepted overview failure class)
- **THEN** the design coordinator SHALL establish `Cause Locus: in-scope` via the phase-static channel without reading change artifacts or parsing `summary` prose
- **AND** the shared runner SHALL apply the distinct-diagnosis ledger and `continue_after_recovery` using diagnosis_key `(openspec/changes/{change-name}/change-overview.md, overview-generation-repair, design-worker-overview-repair)` without requiring a design command-card edit

#### Scenario: E11 a changed failure class keeps one pool

- **WHEN** a same-worker recovery continuation returns a different valid worker failure class
- **THEN** the shared runner SHALL compare the coordinator-owned diagnosis key rather than creating a class-specific budget
- **AND** it SHALL stop before dispatch when the concrete diagnosis is duplicated, or spend one remaining distinct slot only when the diagnosed cause is new

#### Scenario: Build inherits apply without a build-card edit

- **WHEN** `/sai-build` activates its existing apply phase adapter
- **THEN** the apply segment SHALL use the shared non-clean-closure and recovery route
- **AND** `sai/commands/build/coordinator.md` SHALL retain its own resolution, re-entry, fast-track, and non-removable STOP rules unchanged

#### Scenario: Existing invocation crosses the new seam

- **WHEN** an existing routed planning invocation is executed after the extraction
- **THEN** its observable workflow behavior and durable artifacts SHALL match the behavior required before the extraction
- **AND** no new user decision or artifact field SHALL be introduced by the refactor

#### Scenario: Claude Code routed invocation is preserved

- **WHEN** a Claude Code design or implementation wrapper invokes a routed planning phase
- **THEN** its runtime skill SHALL resolve the canonical Claude binding, dispatch the existing named Claude planning agent, and continue by captured agent ID

#### Scenario: opencode routed invocation is preserved

- **WHEN** an opencode design or implementation wrapper invokes a routed planning phase
- **THEN** its runtime skill SHALL resolve the canonical opencode binding, dispatch the existing named planning worker through `task`, and continue by captured task ID

#### Scenario: Copilot inline invocation is preserved

- **WHEN** a GitHub Copilot design or implementation wrapper invokes a planning phase
- **THEN** it SHALL resolve the existing inline command body and SHALL NOT enter the routed coordinator lifecycle

### Requirement: Distinct diagnosis recovery ledger

After change resolution, the shared contract SHALL trigger coordinator diagnosis for every post-resolution non-clean closure: a failed result of any worker class, a `completed` result independently disproven by coordinator verification, or a `completed` result carrying `STOP reached? = yes`. The coordinator SHALL diagnose before deciding recovery eligibility. The routing diagnosis SHALL remain exactly one of `worker-authored failure`, `coordinator rejection`, or `continuation/transport loss`; routing diagnosis is separate from the worker `failure_class` and from the recovery-budget identity.

For an opted-in phase-adapter segment, the recovery budget SHALL be a ledger of exactly three available diagnosis slots, not a reusable retry counter. Each eligible in-scope diagnosis SHALL have one coordinator-authored normalized `diagnosis_key` derived from the concrete cause evidence and correction boundary. A new key SHALL spend exactly one slot and permit at most one same-worker recovery attempt; a key already present in the ledger SHALL be rejected as a duplicate before dispatch and before spending a slot, and recovery SHALL stop even if an unused slot remains. The worker-authored `failure_class` SHALL be a diagnostic prior, not the eligibility gate: with `unrecoverable: false`, a coordinator-proven clear safe in-scope cause MAY make even `blocking-contradiction` or `unclassified-worker-fault` eligible, while an out-of-scope or unresolved Cause Locus SHALL spend zero regardless of class. A changed worker failure class, routing diagnosis, or summary SHALL not make the same concrete cause a new key. Malformed and continuation/transport-loss cases SHALL use their existing zero-attempt hand-back or stop behavior.

The shared runner SHALL define key equality as exact equality of the ordered tuple `(artifact path, concrete point, authorized correction boundary)`. Cause Locus SHALL remain beside the key in coordinator-only closure-diagnosis state and SHALL not participate in identity, so an improved locus assessment cannot make one concrete cause new. Artifact paths SHALL be normalized to repo-relative `/` paths with a leading `./` removed and `..` traversal rejected; only non-semantic whitespace may be collapsed. The concrete point SHALL preserve the Step, field, command, assertion, lifecycle boundary, selectors, operators, targets, and pass/fail polarity. The authorized correction boundary SHALL preserve the worker scope and permitted correction surface. Worker prose, failure class, and routing label SHALL be excluded from the key. A second closure with equal normalized tuple fields SHALL be a duplicate; a changed artifact path, concrete point, or correction boundary SHALL produce a new key.

The ledger SHALL be coordinator-only state, ordered by first diagnosis, and SHALL not enter a worker lifecycle payload, recovery prompt, artifact, progress plan, or invocation `changed_files` union. The segment boundary, changed-file union, replacement fallback outside recovery, cancellation behavior, and fast-track behavior remain unchanged.

#### Scenario: Any post-resolution failed class enters diagnosis

- **WHEN** a resolved worker returns a structurally valid `failed` result with any closed worker `failure_class`
- **THEN** the coordinator SHALL create exactly one closure diagnosis before checking eligibility
- **AND** a veto, out-of-scope cause, or unresolved cause SHALL stop with zero recovery slots rather than bypassing diagnosis

#### Scenario: Worker class is a prior, not the recovery gate

- **WHEN** a failed worker result carries `blocking-contradiction` or `unclassified-worker-fault` with `unrecoverable: false` and coordinator evidence proves a clear safe in-scope correction
- **THEN** the coordinator SHALL retain the worker class and routing diagnosis
- **AND** it SHALL permit the new diagnosis key to consume one recovery slot

#### Scenario: Out-of-scope locus overrides an eligible class

- **WHEN** a worker result carries an otherwise eligible class but coordinator evidence proves the cause is outside the worker's authorized scope
- **THEN** the coordinator SHALL assign `Cause Locus: out-of-scope`
- **AND** it SHALL spend zero recovery slots without rewriting the worker class

#### Scenario: Completed STOP enters diagnosis

- **WHEN** a resolved worker returns `completed` with `STOP reached? = yes`, even if another report field appears successful
- **THEN** the coordinator SHALL classify the closure as non-clean and create exactly one closure diagnosis
- **AND** it SHALL not mark a Step or commit before the diagnosis route terminates cleanly

#### Scenario: A new diagnosis spends one slot once

- **WHEN** an eligible in-scope closure has a `diagnosis_key` not present in the active segment ledger
- **THEN** the coordinator SHALL record that key and spend exactly one of the three slots
- **AND** it SHALL permit at most one same-worker recovery continuation for that key

#### Scenario: Duplicate diagnosis stops before exhaustion

- **WHEN** a later non-clean closure produces a `diagnosis_key` already recorded in the active segment
- **THEN** the coordinator SHALL stop recovery before dispatching a continuation
- **AND** it SHALL spend no additional slot and report duplicate diagnosis rather than pool exhaustion

#### Scenario: Diagnosis-key equality ignores worker prose

- **WHEN** two closures have equal normalized artifact path, concrete point, and authorized correction boundary but different Cause Locus values, summaries, or worker classes
- **THEN** the shared runner SHALL treat their diagnosis keys as equal
- **AND** the second closure SHALL stop before spending a slot

#### Scenario: Diagnosis-key equality distinguishes concrete points

- **WHEN** two closures differ in their normalized artifact path, concrete point, or authorized correction boundary
- **THEN** the shared runner SHALL treat their diagnosis keys as distinct
- **AND** the later key MAY spend a remaining slot only after the coordinator proves an in-scope safe correction

#### Scenario: Out-of-scope diagnosis has no ledger entry

- **WHEN** concrete evidence proves that a non-clean cause is outside the active worker's authorized scope
- **THEN** the coordinator SHALL hand back or use the explicitly authorized owner-repair route
- **AND** it SHALL record no recovery key and spend zero recovery slots
