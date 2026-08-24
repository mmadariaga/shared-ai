# explore-pipeline-supervision Specification

## MODIFIED Requirements

### Requirement: Auto-fast slice completion transition

On an Auto (fast implementation) selection, explore SHALL execute the existing eight-step worker flow in fixed order for the selected slice. After, and only after, the final `--autofast-finish` worker returns a clean terminal `completed` result, explore SHALL record that result in the first-seen changed-file union, add the selected change to `completed_changes`, preserve the completed slice's progress states, and enter the completion transition exactly once. The transition SHALL preserve existing worker order, worker payloads, commit ownership, and failure semantics.

#### Scenario: A cleanly completed slice hands off to the next slice

- **WHEN** the final finish worker returns a clean terminal `completed` result and another crystallized slice is not in `completed_changes`
- **THEN** explore records the completed slice before recomputing remaining slices and re-enters the existing selector without dispatching a worker from the transition

### Requirement: Auto-fast re-entry uses deterministic selection

When the completion transition finds uncompleted entries in `last_crystallization_set`, explore SHALL recompute them only by subtracting `completed_changes`, preserve crystallization order, and apply the existing deterministic selection rules. The re-entered selector SHALL never select a completed name, run `openspec list --json`, or re-sort names; it SHALL retain the existing single-entry, multiple-entry, empty-set, and active-run behavior.

#### Scenario: Re-entry excludes completed slices

- **WHEN** a completed slice and one or more uncompleted slices remain in the crystallization set
- **THEN** the selector offers or dispatches only the uncompleted slices in their original crystallization order

### Requirement: Auto-fast slice attempts reset only per-attempt state

Each re-entered slice selection SHALL start a fresh Auto-fast attempt and reset `base_sha`, `fix_rounds`, and the Auto-fast diagnosis counters according to their existing per-attempt rules. The reset SHALL retain `completed_changes` and completed idea-progress states, and a failed, cancelled, incomplete-recovery, coordinator-disproved, or STOP-bearing result SHALL not mark the slice completed or trigger completion re-entry.

#### Scenario: A new slice gets fresh attempt state

- **WHEN** the completion transition re-enters selection for an uncompleted slice
- **THEN** the next slice starts with reset per-attempt counters while previously completed slice state remains intact

### Requirement: Auto-fast terminal navigation waits for slice exhaustion

Explore SHALL defer the existing Auto-fast terminal report and navigation while any slice in `last_crystallization_set` remains uncompleted. When no uncompleted slice remains, including the single-slice case, explore SHALL emit the existing terminal report and navigation exactly once and clear `active_change`; the completion transition SHALL emit no premature terminal navigation.

#### Scenario: Exhausted slices close once

- **WHEN** the completion transition finds no uncompleted crystallized slice
- **THEN** explore emits the existing terminal report and navigation once and clears `active_change` without showing another selector
