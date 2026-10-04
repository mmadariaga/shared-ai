# to-backlog-issue-format Specification

## Purpose
Define a provider-neutral backlog title and description format that distinguishes agreed work from unresolved questions, preserves identifier history, and records cumulative agreement maturity.

## Requirements

### Requirement: Provider-neutral title and section structure

The to-backlog format SHALL require an imperative, outcome-focused title without a type prefix. Creation descriptions SHALL use `##` headings for Problem, Goal, Scope, Non-goals, Open questions, and Maturity, in that order. Optional Edge cases, Implementation notes, Decisions, and Research leads SHALL appear between Non-goals and Open questions in that order and SHALL be omitted when empty. Each section's rules SHALL be defined beside its required or optional status in the authoritative companion reference.

#### Scenario: Create a complete description

- **WHEN** the skill drafts a new item with agreed content for mandatory and optional sections
- **THEN** it uses the required title style and section order, including only nonempty optional sections.

#### Scenario: Empty optional sections

- **WHEN** an optional section has no agreed content, or Research leads has no references
- **THEN** that section is omitted rather than populated with an empty-section marker.

### Requirement: Explicit agreement boundaries

Agreed behavior, constraints, and decisions SHALL require explicit user acceptance in the conversation. Agent recommendations, user silence, and draft existence SHALL NOT establish agreement. Unconfirmed proposals SHALL remain in Open questions as choices requiring agreement. Research leads SHALL be a non-authoritative exception: references and relevance notes require investigation and establish no requirement or verified fact. Verified evidence alone SHALL NOT establish agreement on an associated decision.

#### Scenario: Tentative solution

- **WHEN** an agent proposes behavior without explicit user acceptance
- **THEN** the proposal remains in Open questions rather than becoming an agreed requirement or decision.

#### Scenario: Research reference

- **WHEN** a description includes a reference for further investigation
- **THEN** Research leads identifies its relevance without treating the reference as a requirement or verified fact.

### Requirement: Section-local result rules

Problem SHALL state the agreed problem, affected party or system, and why it matters. Goal SHALL state an agreed outcome distinct from a proposed solution. Scope SHALL contain verifiable agreed behaviors and constraints instead of a duplicate acceptance-criteria section. Repository-wide conventions SHALL appear only for a concrete exception or risk. Non-goals SHALL contain agreed exclusions, using `None.` for an explicitly agreed empty set. Missing agreement in mandatory sections SHALL be recorded as `Not agreed yet.` rather than invented. Edge cases SHALL use E# identifiers; necessary Implementation notes SHALL use I# identifiers; Open questions SHALL use Q# identifiers or `None.` when empty. Decisions SHALL record agreed choices and rationale, including agreed deferrals. Published descriptions SHALL contain results rather than template instructions.

#### Scenario: Incomplete idea

- **WHEN** necessary agreement for a mandatory section is absent
- **THEN** the description retains that section with `Not agreed yet.` and places tentative content in Open questions.

#### Scenario: Verifiable scope

- **WHEN** scope has been agreed
- **THEN** each Scope statement permits a later reader to determine whether it is satisfied without a duplicate acceptance-criteria section.

### Requirement: Cumulative agreement maturity

Maturity SHALL identify the highest cumulative agreement level supported by the conversation, not implementation progress or section presence. `Idea` SHALL require agreed problem and goal with scope pending. `Scope agreed` SHALL add agreed scope and exclusions. `Edge cases agreed` SHALL add reviewed and agreed edge cases, including an agreed empty set. `Ready to propose` SHALL add reviewed and agreed necessary implementation details, including an agreed empty set, with no proposal-blocking questions. Every level SHALL require all preceding levels. A deferred decision SHALL stop blocking only when its deferral is explicitly agreed. Without the Idea criteria, Maturity SHALL be `Not agreed yet.`.

#### Scenario: Agreed empty edge-case set

- **WHEN** scope and exclusions are agreed and review establishes an explicitly agreed empty set of edge cases
- **THEN** Maturity may be `Edge cases agreed` without adding an empty Edge cases section.

#### Scenario: Unagreed deferral

- **WHEN** a necessary unresolved decision has been suggested for deferral without user agreement
- **THEN** the suggested deferral does not remove its proposal-blocking status.

### Requirement: Update preservation and invalidated agreement

Updates SHALL apply the agreed refinement to the current baseline and preserve unaffected description content verbatim, including section structure outside the edit boundary. The format SHALL NOT trigger migration or normalization of historical issues. An unclear edit boundary SHALL require clarification before modification. If a refinement invalidates an earlier agreement, affected content SHALL be revisited and Maturity SHALL be lowered to the highest still-supported level while unaffected content remains unchanged.

#### Scenario: Limited refinement

- **WHEN** an agreed update affects only part of a historical description
- **THEN** format rules apply within that boundary and unaffected content and section structure remain unchanged.

#### Scenario: Agreement invalidation

- **WHEN** a refinement invalidates agreement needed for the recorded maturity level
- **THEN** affected content is revised and Maturity is recomputed from the remaining supported cumulative agreement.

### Requirement: Stable identifiers and retained counters

Updates SHALL preserve existing E#, I#, and Q# identifiers without renumbering or reusing removed identifiers; gaps SHALL be valid. Descriptions SHALL retain maximum-used counters in a Markdown comment shaped as `<!-- backlog-id-counters: E=3 I=2 Q=5 -->`, with actual numeric values. Before allocation, each maximum SHALL be taken from both existing identifiers and its stored counter, and new identifiers SHALL exceed that maximum. Unused families in new items SHALL start at zero. A baseline without counters SHALL initialize them from existing identifiers without inventing unavailable history. Counters SHALL NOT decrease after deletion or resolution. Resolved questions SHALL move agreed content to its appropriate section with a new identifier where applicable while retaining the used Q counter. The comment SHALL remain published metadata and SHALL be shown literally in the complete approval draft.

#### Scenario: Removed identifier

- **WHEN** an update removes E3 while the E counter remains three
- **THEN** the next allocated edge-case identifier exceeds three and the counter does not decrease.

#### Scenario: Historical baseline without counters

- **WHEN** an update baseline contains identifiers but no bookkeeping comment
- **THEN** counters initialize from existing identifiers without guessing deleted history.

#### Scenario: Resolve a question

- **WHEN** Q5 resolves into an agreed implementation detail
- **THEN** the detail receives a new I identifier above its maximum and the Q counter retains its used maximum.

### Requirement: Drafting completion remains separate from publication

Drafting SHALL complete only after applicable section-local rules pass, missing mandatory agreement is explicit, empty optional sections are omitted, unconfirmed proposals remain in Open questions, section order is correct within the update boundary, Scope is verifiable, Research leads remains non-authoritative, identifiers and counters are preserved, and Maturity matches conversation evidence. Updates SHALL also verify that unaffected content is unchanged. Passing these checks SHALL NOT authorize publication or turn tentative content into agreement.

#### Scenario: Ready draft without publication approval

- **WHEN** all format checks pass but explicit publication approval has not been given
- **THEN** preparation may complete while publication remains unauthorized.
