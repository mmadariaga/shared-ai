# explore-refactor-first-slicing Specification

## Purpose

Add a refactor-first integration-point friction assessment to `sai-explore`, so the exploration phase can detect when the code at the feature's integration point is hostile and prepend a behavior-preserving refactor slice (slice 0) before the feature slice(s).

## Requirements

### Requirement: refactor-first-integration-point-friction-assessment

`sai-explore` SHALL, after the size-based slicing assessment and before crystallizing any `Ready to Propose` block, judge whether the exact site where the imminent feature would integrate is hostile. This friction assessment is DISTINCT from the size judgment: size asks whether the *change* is too big; the friction assessment asks whether the *code the change lands in* is hostile at the integration point.

The integration point is judged hostile when, at the specific site the feature must plug into, either signal holds:
- mixed responsibilities (the site conflates concerns, so the feature cannot be added without touching unrelated behavior); or
- no clean extension seam (the feature can only be added by modifying existing code in place, not by extending it).

The friction judgment SHALL be **local and concrete** — tied to the integration point of the feature at hand — and SHALL NOT be a global tech-debt audit of the surrounding module or repository. The instruction text SHALL frame this as a qualitative judgment, in the same tone as the size judgment.

Blast-radius metrics from a code graph MAY be cited as supporting evidence for a friction judgment, but SHALL NOT be a hard threshold that triggers it; the trigger stays qualitative.

#### Scenario: integration point is hostile

- **WHEN** `sai-explore` evaluates the friction assessment and the exact site the feature would plug into has mixed responsibilities or no clean extension seam
- **THEN** `sai-explore` treats the friction assessment as fired and prepends a behavior-preserving refactor as slice 0

#### Scenario: integration point is clean

- **WHEN** `sai-explore` evaluates the friction assessment and the integration point already offers a clean extension seam with cohesive responsibilities
- **THEN** `sai-explore` does not emit a slice 0 and crystallizes using only the standard protocols

#### Scenario: friction is judged locally, not as a global audit

- **WHEN** the surrounding module carries unrelated tech debt but the specific integration point for the feature is clean
- **THEN** the friction assessment does not fire, because friction is judged at the integration point of the feature at hand, not as a global tech-debt audit

### Requirement: slice-zero-emission-composition

When the friction assessment fires, `sai-explore` SHALL emit the behavior-preserving refactor as **slice 0** of the sliced-crystallization set, ordered ahead of every other slice, reusing the `Ready to Propose` block machinery. Slice 0 SHALL compose with size-based slicing rather than replace it:

- When the feature was already sliced (Walking Skeleton + backlog), slice 0 is prepended ahead of the Walking Skeleton, producing the ordered set refactor → skeleton → backlog.
- When the idea fits a single change, a fired friction assessment SHALL promote the single block into a 2-block set: slice 0 (refactor) → slice 1 (feature).

Slice 0 SHALL live inside the SAME `Ready to Propose` set as the feature slice(s) — one dependency-ordered crystallization output — and SHALL NOT be emitted as a separate recommended change.

#### Scenario: friction promotes a single-block idea into refactor → feature

- **WHEN** the size assessment judged the idea to fit one change AND the friction assessment fires
- **THEN** `sai-explore` emits a 2-block ordered set — slice 0 (behavior-preserving refactor) followed by slice 1 (the feature) — instead of a single block

#### Scenario: friction composes with an already-sliced feature

- **WHEN** the size assessment already sliced the idea into a Walking Skeleton plus backlog AND the friction assessment fires
- **THEN** `sai-explore` prepends slice 0 (the refactor) ahead of the Walking Skeleton, producing the ordered set refactor → skeleton → backlog

### Requirement: solid-scoped-slice-zero-done

`sai-explore` SHALL define the "done" state of slice 0 in SOLID terms so the refactor opens the code exactly where the feature needs to attach:

- **SRP as diagnosis-remedy**: extract the mixed responsibility at the integration point to create the seam the feature needs;
- **OCP as target seam**: shape that seam so the imminent feature attaches by extension rather than by modifying existing code;
- **Behavior-preserving**: slice 0 changes no observable behavior and existing tests stay green;
- **YAGNI guardrail (mandatory)**: slice 0 opens ONLY the axis the imminent feature needs — no speculative generality, and OCP MUST NOT become premature abstraction.

The YAGNI guardrail SHALL appear in the instruction text as a mandatory constraint, not optional guidance.

#### Scenario: slice-zero-done is defined by the SOLID criteria

- **WHEN** `sai-explore` describes slice 0 in the crystallized set
- **THEN** slice 0's completion is defined as SRP extraction creating the seam, OCP so the feature attaches by extension, existing tests green, and the seam opened only along the axis the imminent feature needs

#### Scenario: YAGNI guardrail bounds the refactor

- **WHEN** an extension seam could be opened along several axes but the imminent feature needs only one
- **THEN** slice 0 opens only the axis the feature needs, and does not add speculative generality or premature abstraction along the other axes

### Requirement: slice-zero-outcome-description-exception

The sliced protocol requires each slice to be described as a user-facing outcome. `sai-explore` SHALL apply an exception for slice 0: slice 0 SHALL be described as **enabling / behavior-preserving** and SHALL be **explicitly marked** as such, NOT as user-facing value. Every other slice (Walking Skeleton and backlog) SHALL keep its user-facing outcome description unchanged.

#### Scenario: slice 0 is marked as enabling, not user-facing value

- **WHEN** `sai-explore` emits slice 0 in the crystallized set
- **THEN** slice 0's description states it is an enabling, behavior-preserving refactor and is explicitly marked as such, rather than describing user-facing value

#### Scenario: feature slices keep user-facing descriptions

- **WHEN** `sai-explore` emits the feature slices (Walking Skeleton and backlog) alongside slice 0
- **THEN** those slices retain their user-facing outcome descriptions and are not marked as enabling/behavior-preserving

### Requirement: refactor-first-recommendation-not-gate

The refactor-first assessment SHALL be guidance, not a gate. When the friction assessment fires but the user prefers to land the feature directly in the tangle, `sai-explore` SHALL state the risk once, briefly, then proceed WITHOUT slice 0 — it SHALL NOT re-litigate the recommendation or block crystallization.

#### Scenario: user declines the refactor-first recommendation

- **WHEN** the friction assessment fires and `sai-explore` recommends a slice 0, but the user prefers to keep the feature as-is without the preparatory refactor
- **THEN** `sai-explore` states the risk once and briefly, then crystallizes without slice 0, and does not re-litigate the recommendation
