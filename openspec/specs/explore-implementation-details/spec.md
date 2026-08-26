# explore-implementation-details Specification

## Purpose

TBD

## Requirements

### Requirement: The implementation-details stage surfaces and confirms technical decisions

When the user advances to the `Implementation details` stage of the pre-crystallization staged progression (`explore-pre-crystallization-stages`), `sai-explore` SHALL surface the technical decisions surfaced during exploration as numbered proposed statements `I1` through `In`, followed by one plain conversational confirmation question asking whether the list accurately captures the agreed technical decisions or needs adjustment. The question SHALL name the `next-step` token as the advancement action — confirming completes the stage and advances into the `Crystallize` stage, which counts as the explicit crystallization request (`explore-pre-crystallization-stages`). The question SHALL follow the `@sai/policies/question-context.md` anatomy, SHALL be understandable in the conversation's ambient language, SHALL NOT depend on a fixed confirmation phrase, and SHALL NOT use a native yes/no option picker. Only technical decisions that direct or constrain the implementation qualify as `I` items — the "what"; the rationale behind a decision and rejected alternatives SHALL NOT be surfaced as `I` items, as they belong in the block's **Decisions & Rationale** and **Alternatives Considered** sections. A decision whose object is a bookkeeping artifact of the change (`openspec/changes/{name}/**`, `openspec/specs/**`) does not qualify as an `I` item — it is a consequence owned by backfill and archive. An agreed `I` item MAY carry exact repository-relative paths when the agreed decision is grounded in specific files; this adds no field to the block template and does not convert the block into an implementation plan.

#### Scenario: Advancing to the stage surfaces the decisions

- **WHEN** the user advances into `Implementation details` and exploration surfaced technical decisions
- **THEN** the decisions are presented as numbered `I1`…`In` statements with one confirmation question in the ambient language

#### Scenario: Grounded I item carries exact target paths

- **WHEN** an agreed technical decision is grounded in specific files and carries exact repository-relative paths
- **THEN** the item keeps its `I` identifier and wording with those paths inline and the block template gains no new field

#### Scenario: The question names the advancement action

- **WHEN** the implementation-details confirmation question is asked
- **THEN** the question names the `next-step` token as the action that advances the progression

#### Scenario: Rationale is not surfaced as an I item

- **WHEN** exploration surfaced reasoning or rejected alternatives but no decision that directs the implementation
- **THEN** no `I` item is invented for the reasoning, which remains material for **Decisions & Rationale** / **Alternatives Considered**

#### Scenario: Bookkeeping artifact decisions are excluded

- **WHEN** the stage-3 implementation-details list includes a decision whose object is a bookkeeping artifact of the change
- **THEN** that decision is excluded from the proposed `I` items and does not appear in the confirmation question or agreed list

#### Scenario: Empty list after exclusion emits None deterministically

- **WHEN** all technical decisions in the exploration would qualify as bookkeeping-artifact decisions
- **THEN** the stage emits exactly `- None` and advances without a confirmation question

### Requirement: Confirmation converges the implementation-details stage

When the user semantically confirms the proposed list, `sai-explore` SHALL record the current ordered list as agreed, complete the stage, and advance the progression to the `Crystallize` stage within the same turn. A disagreement, removal, addition, or material revision SHALL update and renumber the proposed list consecutively, keep the stage open, and ask the confirmation question again. An ambiguous response SHALL be treated as continued discussion and the question SHALL be clarified and re-asked.

#### Scenario: Semantic confirmation closes the stage and advances

- **WHEN** the user communicates that the proposed technical-decision list is correct
- **THEN** the list is recorded as agreed, the stage completes, and the progression advances to the `Crystallize` stage within the same turn

#### Scenario: A requested change iterates the list

- **WHEN** the user asks to change, add, or remove a technical decision
- **THEN** the list is updated and renumbered consecutively and the confirmation question is re-asked

### Requirement: An empty set emits None and advances without iteration

When no technical decision qualifies for the stage, `sai-explore` SHALL emit exactly `- None` and advance the stage progression without running the confirmation question â€” no iteration. This deterministic empty-set rule is the sole stage advancement not preceded by explicit user intent, and it never fires any gate or questionnaire.

#### Scenario: An empty set completes the stage immediately

- **WHEN** the user advances into `Implementation details` and no technical decision was surfaced
- **THEN** `sai-explore` emits `- None` and the progression advances without a confirmation question

### Requirement: The Ready to Propose block carries an Implementation Details section

Every `Ready to Propose` block â€” the single-change protocol and each per-slice block of the sliced protocol â€” SHALL include a dedicated `**Implementation Details**` section placed immediately after `**Edge Cases**`, carrying the agreed `I1` through `In` statements in their established order with their identifiers and wording preserved, or exactly one `- None` bullet when the agreed list is empty. The section SHALL carry only the agreed technical decisions â€” the "what"; their rationale and alternatives SHALL NOT be restated there, remaining in **Decisions & Rationale** and **Alternatives Considered**.

#### Scenario: A single-change block includes the agreed decisions

- **WHEN** the agreed technical-decision list is non-empty and a single-change block is emitted
- **THEN** the block's `**Implementation Details**` section lists the agreed `I1`â€¦`In` statements in order immediately after `**Edge Cases**`

#### Scenario: An empty agreed list emits None

- **WHEN** the agreed list is empty
- **THEN** the block's `**Implementation Details**` section carries exactly one `- None` bullet

#### Scenario: Every per-slice block carries the section

- **WHEN** the sliced protocol emits a set of per-slice blocks
- **THEN** each block carries the full agreed `I1`â€¦`In` list in order, or exactly `- None` when the list is empty, and no slice omits the section
