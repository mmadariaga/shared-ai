# bounded-recovery-policy-home Specification

## Purpose

TBD - created by archiving change extract-bounded-recovery-to-policy. Update Purpose after archive.

## Requirements

### Requirement: Bounded recovery machinery lives in a dedicated policy file

The repository SHALL host the shared bounded same-worker recovery machinery in `sai/policies/bounded-recovery.md`, relocated byte-verbatim from the former `## Bounded Recovery` section of `sai/orchestration/command-runner.md`. The policy SHALL carry the complete machinery: the segment-scoped three-slot distinct-diagnosis ledger, post-resolution diagnosis, exactly three routing diagnoses, Cause Locus with dual inspection channels, diagnosis-key normalization, diagnosis-driven eligibility, zero-attempt branches, dispatch and continuation, input/cancellation/hand-back behavior including the Explore Auto item-10 exception, changed-files-union and fast-track invariants, the planning-adapter recovery surface with channel selection, and the Step 2 GREEN phase-static registry with its sole `design-overview-repair` row. The policy header SHALL state that it extends the shared command runner's Result Loop and SHALL name its unconditional audience: every coordinator whose phase adapter opts into recovery (`recovery_policy: true`) or executes such a segment under composition. The policy file SHALL be the single home of that machinery; no other file under `sai/` SHALL carry a duplicate of the phase-static registry table.

#### Scenario: Policy hosts the full relocated machinery

- **WHEN** `sai/policies/bounded-recovery.md` is read
- **THEN** it contains the segment-scoped three-slot ledger rules, the closed routing-diagnosis vocabulary, Cause Locus and dual inspection channels, diagnosis-key normalization, eligibility, zero-attempt branches, dispatch/continuation, hand-back, Explore Auto item-10 exception, union/fast-track invariants, planning-surface channel selection, and the deterministic match matrix
- **AND** its header states that it extends the shared command runner's Result Loop and names the recovery-opted coordinator audience

#### Scenario: The policy is the sole runtime registry home

- **WHEN** all markdown files under `sai/` other than `sai/policies/bounded-recovery.md` are inspected
- **THEN** none contains a `design-overview-repair` registry table row
- **AND** the sole executable registry listing for the match algorithm lives in `sai/policies/bounded-recovery.md`

### Requirement: Recovery-role coordinators load the policy statically

Exactly four coordinator cards — `sai/commands/spec/coordinator.md`, `sai/commands/design/coordinator.md`, `sai/commands/apply/coordinator.md`, and `sai/commands/build/coordinator.md` — SHALL each carry one static, unconditional fetch line reading `Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.` inserted immediately after each card's first fetch directive. No worker binding, utility body card, audit coordinator card, or adapter file SHALL fetch the policy: workers never diagnose routing, and utility commands never execute the shared result loop. The load SHALL be a deliberate static resident load per role rather than an event-triggered conditional fetch.

#### Scenario: All four coordinator cards carry the static fetch

- **WHEN** any of the spec, design, apply, or build coordinator cards is read
- **THEN** it contains the exact line `Fetch @sai/policies/bounded-recovery.md and follow it as part of the shared runner.`
- **AND** the line appears immediately after that card's first fetch directive

#### Scenario: Non-coordinator sessions never load the policy

- **WHEN** any routed worker binding, utility body card, review/security/performance/accessibility coordinator card, or adapter file is inspected
- **THEN** it contains no fetch of `sai/policies/bounded-recovery.md`

#### Scenario: Residency does not depend on a runtime event

- **WHEN** a coordinator whose adapter opts into recovery starts a segment
- **THEN** the bounded-recovery policy is already resident through the card's static fetch
- **AND** no non-clean result or other runtime event is required to trigger the load

### Requirement: The slimmed runner preserves composition continuity

After the relocation, `sai/orchestration/command-runner.md` SHALL keep its Result Loop core byte-stable. Its composition rule 1 SHALL retain ordered execution, activation-time rebinding of segment fields (including `progress_plan` and `recovery_policy`), and invocation-scoped changed-files union continuity across transitions, and SHALL replace its duplicated ledger-creation and scoping sentences with a single deferral naming `@sai/policies/bounded-recovery.md` as the owner of recovery-ledger creation, scoping, and non-inheritance across segments. The runner's closed phase-adapter field listing SHALL append `(recovery semantics: @sai/policies/bounded-recovery.md)` to the `recovery_policy` entry. The stale historical prose block referencing the long-archived `chainable-apply-phase-adapter` change SHALL be removed from the runner.

#### Scenario: Composition rule defers ledger mechanics without losing continuity

- **WHEN** composition rule 1 in the slimmed runner is read
- **THEN** recovery-ledger creation, scoping, and non-inheritance across segments are deferred to `@sai/policies/bounded-recovery.md`
- **AND** ordered execution, segment-field rebinding, and changed-files union continuity across transitions remain stated in the rule itself

#### Scenario: Result Loop core remains byte-stable

- **WHEN** the slimmed runner is compared against its pre-change content outside the deleted section, the rule-1 deferral, the removed historical block, and the appended field pointer
- **THEN** the remaining Result Loop text is byte-identical

#### Scenario: The recovery_policy field entry points at the policy

- **WHEN** the runner's closed phase-adapter field listing is read
- **THEN** the `recovery_policy` entry carries the recovery-semantics pointer to `@sai/policies/bounded-recovery.md`
