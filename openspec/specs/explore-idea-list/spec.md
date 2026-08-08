# explore-idea-list Specification

## Purpose

TBD - seeded from delta spec `explore-idea-list` in change `explore-idea-progress-plan`.

## Requirements

### Requirement: idea-list-scope-and-state

`sai-explore` SHALL maintain a chat-scoped idea progress list that tracks the explored idea, held in conversation only. The list SHALL NOT be written to any file, artifact, change directory, or configuration, and SHALL NOT be derived from repository state (no `openspec list --json`, no disk enumeration, no artifact reads).

#### Scenario: fresh chat holds the list in conversation

- **WHEN** a fresh `sai-explore` chat begins
- **THEN** the idea progress list is tracked in conversation with a single unmarked research item
- **AND** the list is not rendered while it holds only that item

#### Scenario: list is never persisted

- **WHEN** the explore session adds, updates, or marks list items
- **THEN** no file, artifact, change directory, or configuration is created, modified, or deleted

#### Scenario: list is never derived from repository state

- **WHEN** the list is rendered or updated
- **THEN** its contents come only from in-session evidence and never from `openspec list --json`, disk enumeration, or artifact reads

### Requirement: idea-list-item-catalog

The idea progress list SHALL contain exactly these item kinds: one research item, and — per crystallized slice — one slice-crystallization item, one reviewed-sai-1 item, and one reviewed-sai-2 item. A crystallized slice SHALL be one `**Change name**` value emitted by a crystallization turn (items 5/6 of `sai/instructions/explore.md`). Items SHALL be added in the order the slicing assessment identifies the slices; a duplicate later identification of a change name already present in the list SHALL add no items. The list SHALL contain no implementation item and no other item kind.

#### Scenario: single-change chat produces four items

- **WHEN** a chat crystallizes one change
- **THEN** the list contains the research item plus that slice's three items: slice-crystallization, reviewed-sai-1, and reviewed-sai-2

#### Scenario: sliced crystallization produces the research item plus per-slice sets

- **WHEN** a sliced crystallization turn emits N blocks
- **THEN** the list contains the research item plus N ordered sets of three per-slice items, in slice-identification order

#### Scenario: duplicate identification adds nothing

- **WHEN** a crystallization turn identifies a slice whose change name is already present in the list
- **THEN** no new items are added for that slice

#### Scenario: no implementation item exists

- **WHEN** a later command implements the slice in another session
- **THEN** the list never gains an implementation item
- **AND** no item is added or marked from that event

### Requirement: idea-list-rendering

The list SHALL NOT be rendered while it holds only the research item; it SHALL first render when it first carries more than the research item, at the first slice identification, and SHALL re-render whenever an item is added, marked, or cleared after that. Rendering SHALL be plain in-conversation text, identical on Claude Code and opencode; unmarked items SHALL render with an unchecked checkbox and marked items with a checked checkbox. A turn that adds or changes items SHALL render the list exactly once, after all of that turn's additions and state changes have been applied.

#### Scenario: no list while it holds only the research item

- **WHEN** a fresh `sai-explore` chat holds only the unmarked research item
- **THEN** no list is rendered
- **AND** the research item's state is still tracked in conversation

#### Scenario: the list first renders at the first slice identification

- **WHEN** the slicing assessment first identifies a slice
- **THEN** the list renders with the research item and that slice's three items in their current states

#### Scenario: later turns re-render on change

- **WHEN** an item is added, marked, or cleared after the first render
- **THEN** the list re-renders with the updated content

#### Scenario: a turn renders the list once

- **WHEN** a crystallization turn identifies slices, emits blocks, and marks items
- **THEN** the list is rendered exactly once, after all of that turn's additions and state changes have been applied

#### Scenario: both harnesses render identically

- **WHEN** the same list state exists on Claude Code and opencode
- **THEN** both render the same in-conversation text list with the same items, order, and checkbox states

### Requirement: research-item-marking

The research item SHALL be added unmarked at the start of the chat and SHALL be marked when the chat's first `Ready to Propose` block is emitted (the single-change protocol, or the first block of a sliced emission). No other event SHALL mark it.

#### Scenario: first emission marks research

- **WHEN** the chat emits its first `Ready to Propose` block
- **THEN** the research item is marked

#### Scenario: no emission leaves research unmarked

- **WHEN** the session ends without any crystallization emission
- **THEN** the research item remains unmarked

#### Scenario: a sliced set marks research once

- **WHEN** a sliced crystallization turn emits several blocks
- **THEN** the research item is marked at the first emission and is not re-marked

### Requirement: slice-crystallization-item-marking

When the slicing assessment (item 4 of `sai/instructions/explore.md`) identifies a slice, its slice-crystallization item and its two review items SHALL be added in the unmarked state. The slice-crystallization item SHALL be marked when that slice's `Ready to Propose` block is emitted; the two review items SHALL remain unmarked, awaiting review-pass evidence.

#### Scenario: assessment adds slice items unmarked

- **WHEN** the slicing assessment identifies a slice
- **THEN** its slice-crystallization, reviewed-sai-1, and reviewed-sai-2 items are added in the unmarked state

#### Scenario: block emission marks the slice item

- **WHEN** a slice's `Ready to Propose` block is emitted
- **THEN** its slice-crystallization item is marked
- **AND** its review items remain unmarked
