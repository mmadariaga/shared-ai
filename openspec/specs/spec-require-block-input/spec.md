# spec-require-block-input Specification

## Purpose
TBD - created by archiving change spec-require-block-input. Update Purpose after archive.
## Requirements
### Requirement: Creation requires crystallized block concepts

The `sai-1-spec` creation entry SHALL require the crystallized `Ready to Propose` block judged by concepts never byte-exact: What, Why, Capabilities in scope, Decisions and Rationale, Alternatives Considered, Trade-offs Accepted, Key constraints, Terms, Edge Cases, and Implementation Details, with Change name as the resolution source. When the request carries those concepts the worker SHALL resolve the name from the block and proceed as creation. Otherwise the worker SHALL STOP before change resolution and print exactly the creation STOP with redirect to sai-explore. This covers an empty request, a name-only request, an incomplete block with any listed concept missing, and a hand-created change directory with no proposal or specs.

#### Scenario: Missing block stops creation

- **WHEN** creation is invoked without the block concepts
- **THEN** the worker SHALL STOP before resolution with the redirect to sai-explore

### Requirement: No change-picker fallback and no name-only creation path

The `sai-1-spec` worker SHALL never fetch the change-picker policy. There SHALL be no change-picker fallback and no name-only creation path in this phase.

#### Scenario: Picker is never fetched

- **WHEN** the spec worker starts the creation entry
- **THEN** it SHALL proceed without fetching the picker and without a name-only path

### Requirement: Manual path instructs block paste

The `sai-explore` crystallization-close selector and handoff SHALL instruct the Manual path by pasting the Ready to Propose block into a new chat with `/sai-1-spec`, never by name alone. The three Manual-adjacent wordings in the pipeline selector SHALL use the block-paste form and the preserved-English literal list SHALL retain only review-loop, `/sai-1-spec`, and `/sai-2-design`.

#### Scenario: Manual directs block paste

- **WHEN** the selector or handoff presents the Manual route
- **THEN** it SHALL direct pasting the block with `/sai-1-spec` and SHALL NOT present a name-suffixed example

### Requirement: Collaboration style defers maturation to explore

The spec common collaboration style SHALL state that maturation including discovery questions, trade-off discussion, WHY rationale, edge-case probes, and terminology agreement is owned by sai-explore, arrives on creation in the crystallized block and is not re-asked there, while refinement runs carry no block and spec is a normative translation of that block on creation. Normative gap questions that block a correct proposal or specs SHALL remain asked through needs_input.

#### Scenario: Maturation is not re-asked on creation

- **WHEN** creation arrives with the block
- **THEN** the worker SHALL translate it normatively without re-asking maturation yet SHALL still ask blocking normative gaps

### Requirement: Refinement on existing artifacts needs no block

Re-entry or refinement on an existing change directory already holding proposal or specs SHALL need no block and a simple prompt SHALL suffice, including hand-created pre-existing changes with artifacts. A hand-created change directory with no proposal or specs SHALL crystallize first through the creation STOP.

#### Scenario: Existing artifacts refine without block

- **WHEN** refinement targets a change directory holding proposal or specs
- **THEN** the worker SHALL proceed from a simple prompt without requiring the block

