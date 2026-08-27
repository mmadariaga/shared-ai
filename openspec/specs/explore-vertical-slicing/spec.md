# explore-vertical-slicing Specification

## Purpose

Ensure `sai-explore` can assess whether a candidate idea fits a single OpenSpec change, and if not (or if the integration-point friction assessment fires), crystallize it as a dependency-ordered set of review-sized slices. Also covers the optional refactor-first slice 0 when the integration point is hostile.

## Requirements

### Requirement: explore-slicing-assessment-before-crystallization

`sai-explore` SHALL assess whether the candidate idea fits a single OpenSpec change before emitting any `Ready to Propose` block. It SHALL run three orthogonal judgments in order: size, integration-point friction, and technical uncertainty.

The idea is "too big" for one change when any of these scope signals apply:
- several distinct user tasks with orthogonal concerns (not facets of one behavior);
- no end-to-end path achievable in ~1–3 days;
- touches more than one module boundary with no shared integration point.

The integration-point friction assessment remains distinct from size and fires when the exact site has mixed responsibilities or no clean extension seam.

The technical-uncertainty assessment fires only when the same integration depends on an unused third party and available documentation or prior art is insufficient for the required technical or integration case. It does not fire for product or UX uncertainty.

Based on the assessments, `sai-explore` SHALL:
- route to the single-block crystallization protocol when the idea fits one change, friction does not fire, and uncertainty does not fire;
- route to the sliced crystallization protocol when the idea is too big, identifying a Walking Skeleton plus dependency-ordered review-sized slices;
- route to the sliced protocol with slice 0 followed by slice 1 when the idea fits one change but friction fires;
- withhold feature blocks and enter the uncertainty pause when uncertainty fires.

When uncertainty fires together with size or friction, the POC lane runs first if selected. After a viable POC and a `Crystallize full` choice, size and friction are re-evaluated against the post-POC repository. The POC is not a feature slice, does not appear on the feature Idea Progress List, and does not renumber slice 0, the Walking Skeleton, or backlog slices.

The routing determines how many feature blocks crystallization produces and their order; the uncertainty pause determines whether feature emission may begin.

#### Scenario: idea fits a single change

- **WHEN** the candidate idea passes the size and friction assessments and the technical-uncertainty assessment does not fire
- **THEN** `sai-explore` uses the single-block crystallization protocol and, when the user explicitly asks to crystallize, emits exactly one `Ready to Propose` block
- **AND** the block is emitted only after any applicable crystallization-language gate

#### Scenario: idea fits a single change but friction fires

- **WHEN** the size assessment passes, the friction assessment fires, and the technical-uncertainty assessment does not fire
- **THEN** `sai-explore` routes to the sliced crystallization protocol and, on an explicit crystallize request, emits slice 0 followed by slice 1 instead of a single block
- **AND** slice numbering remains unchanged by the absence of a POC

#### Scenario: idea is too big for one change

- **WHEN** the candidate idea trips one or more size scope signals
- **THEN** `sai-explore` identifies a Walking Skeleton and dependency-ordered backlog slices and uses the sliced crystallization protocol on an explicit crystallize request
- **AND** a viable POC, if run first, is not included in that feature slice set

#### Scenario: technical uncertainty pauses feature emission

- **WHEN** the candidate idea depends on an unused third party and the documentation for the required integration case is insufficient
- **THEN** `sai-explore` emits no feature block and enters the uncertainty pause before the crystallization-language gate

#### Scenario: viable POC re-evaluates size and friction

- **WHEN** a viability POC completes successfully and the user selects `Crystallize full`
- **THEN** `sai-explore` re-runs size and friction against the post-POC repository before emitting feature blocks
- **AND** the POC remains outside the feature slice numbering

### Requirement: explore-sliced-crystallization-protocol

When the candidate idea was sliced, `sai-explore` SHALL emit one `Ready to Propose` block per feature slice under a short header that names the Walking Skeleton versus backlog split, with the following layout:

- The Walking Skeleton is always slice 1; slice 0 is reserved for the optional refactor-first slice and is absent when friction does not fire. The skeleton does not renumber to slice 0 in its absence.
- Blocks are numbered in order (slice 0 refactor first when present, then the Walking Skeleton as slice 1, then backlog by dependency).
- Each backlog slice carries a one-line `Depends on:` pointing to the slice or slices it depends on.
- `sai-explore` SHALL instruct the user to take the first block to a new chat with `/sai-1-spec` and explain that each later slice becomes its own change once its predecessor is specced.
- A viability POC, when run, is a separate prior execution and is not emitted as a feature block, not placed on the feature Idea Progress List, and not counted when assigning slice numbers.

The sliced protocol composes with the refactor-first friction assessment: when friction fires, a behavior-preserving refactor is prepended as slice 0 ahead of the Walking Skeleton. Every feature slice other than slice 0 remains a user-facing outcome; slice 0 remains enabling and behavior-preserving.

Each emitted feature block SHALL use the standard single-block format. The protocol defines feature-block composition and ordering; uncertainty completion is required before the set may be emitted.

#### Scenario: sliced feature crystallizes

- **WHEN** the candidate idea was assessed as too big, any required uncertainty pause has completed with either a viable `Crystallize full` or an explicit POC decline, and the user explicitly asks to crystallize
- **THEN** `sai-explore` emits the ordered feature blocks with the Walking Skeleton first, backlog by dependency, and `Depends on:` lines on backlog slices
- **AND** the POC is not included in the emitted set

#### Scenario: sliced feature crystallizes with a friction-driven slice 0

- **WHEN** the candidate idea was sliced, the refactor-first friction assessment fired, and any required uncertainty pause has completed
- **THEN** `sai-explore` prepends slice 0 ahead of the Walking Skeleton and emits the ordered feature set refactor → skeleton → backlog
- **AND** the POC, if any, does not become slice 0

#### Scenario: user wants to override the split recommendation

- **WHEN** the user prefers to keep a large feature as a single change after `sai-explore` recommended slicing and any required uncertainty decision is complete
- **THEN** `sai-explore` states the review risk once and briefly, then proceeds with the single-block crystallization protocol without re-litigating the recommendation
