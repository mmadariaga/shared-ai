# crystallization-implementation-details Specification

## Purpose
Ensure Explore crystallization always reaches agreed implementation details so that every emitted block and every slice owns at least one in-scope item.

## Requirements

### Requirement: Implementation details stage never closes empty

The `Implementation details` list stage SHALL close only with at least one agreed `I` item; when no decision has surfaced, it SHALL propose the implementation approach it needs as `I1` rather than record an empty list. The deterministic `- None` empty-set recording SHALL apply only to `Review edge cases`.

#### Scenario: No surfaced decision yields a proposed I1

- **WHEN** the user advances into `Implementation details` and no technical decision has surfaced
- **THEN** the stage proposes an `I1` item for agreement instead of emitting `- None`

### Requirement: Every slice owns at least one in-scope item

In a sliced set every per-slice block SHALL carry at least one in-scope item; a slice with no item of its own SHALL be treated as a slicing defect, resolved by assigning it the item it extends or delivers or by re-cutting the slices.

#### Scenario: A slice without its own item is re-cut

- **WHEN** slice attribution leaves a slice with no in-scope item
- **THEN** Explore assigns it an item or re-cuts the slices before emitting the set

### Requirement: Slice 0 proposes its refactor item

When the friction assessment fires, the slicing assessment SHALL draft one behavior-preserving refactor item for slice 0 with the next free global `I` identifier and present it with the slicing proposal. The item SHALL be added to the agreed list and in scope of slice 0's block only once the user accepts slice 0, and SHALL be dropped when the user declines slice 0.

#### Scenario: Accepted slice 0 owns its refactor item

- **WHEN** the user accepts a slicing proposal that includes slice 0
- **THEN** slice 0's block carries the drafted refactor item, with the identifier after the highest agreed one, in `**Implementation Details**`

#### Scenario: Declined slice 0 drops the item

- **WHEN** the user declines slice 0
- **THEN** the drafted refactor item is not added to the agreed list
