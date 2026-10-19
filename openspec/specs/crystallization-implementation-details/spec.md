# crystallization-implementation-details Specification

## Purpose
Ensure Explore crystallization always reaches agreed implementation details so that every emitted block and every slice owns at least one in-scope item.

## Requirements

### Requirement: Every slice owns at least one in-scope item

In a sliced set every per-slice block SHALL carry at least one in-scope item, and every agreed `I` SHALL be in scope of at least one slice; a slice with no item of its own SHALL be treated as a slicing defect, resolved by assigning it the item it extends or delivers or by re-cutting the slices. A single change MAY carry a confirmed `- None` instead.

#### Scenario: A slice without its own item is re-cut

- **WHEN** slice attribution leaves a slice with no in-scope item
- **THEN** Explore assigns it an item or re-cuts the slices before emitting the set

#### Scenario: An item owned by no slice is a defect

- **WHEN** slice attribution leaves an agreed `I` out of scope in every slice
- **THEN** the set is not emitted until that item is in scope of at least one slice

### Requirement: Slice 0 proposes its refactor item

When the friction assessment fires, the slicing assessment SHALL draft one behavior-preserving refactor item for slice 0 with the next free global `I` identifier and present it with the slicing proposal. The item SHALL be added to the agreed list and in scope of slice 0's block only once the user accepts slice 0, and SHALL be dropped when the user declines slice 0.

#### Scenario: Accepted slice 0 owns its refactor item

- **WHEN** the user accepts a slicing proposal that includes slice 0
- **THEN** slice 0's block carries the drafted refactor item, with the identifier after the highest agreed one, in `**Implementation Details**`

#### Scenario: Declined slice 0 drops the item

- **WHEN** the user declines slice 0
- **THEN** the drafted refactor item is not added to the agreed list

### Requirement: Implementation details stage closes empty only on user confirmation

The `Implementation details` list stage SHALL never close on its own. When no technical decision qualifies, it SHALL propose exactly `- None` as the list and wait for the user's confirmation; only a bare `next-step` or explicit agreement SHALL record the empty list and advance. A confirmed `- None` SHALL be a valid `**Implementation Details**` value of a single change. The deterministic `- None` empty-set recording without confirmation SHALL apply only to `Review edge cases`.

#### Scenario: No qualifying decision yields a proposed None

- **WHEN** the user advances into `Implementation details` and no technical decision qualifies
- **THEN** the stage proposes exactly `- None` with the list-stage question and does not advance until the user answers with `next-step` or explicit agreement

#### Scenario: Confirmed None enters Crystallize

- **WHEN** the user answers the proposed `- None` with a bare `next-step` or explicit agreement
- **THEN** the empty list is recorded as agreed and the progression enters `Crystallize` in the same turn
