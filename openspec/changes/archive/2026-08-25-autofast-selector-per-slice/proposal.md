> **⚠ POST-HOC RECORD** — This proposal was backfilled after implementation. It describes a decision already made, not one being proposed.

## Why

Multi-slice crystallizations required a separate manual request after each completed Auto-fast slice. The implemented change makes continuation authorization explicit per slice while preserving the existing chat-scoped crystallization state and deterministic selection rules.

## What Changes

After a clean Auto-fast slice completion, the flow records the completed slice before calculating the remaining set. It filters `pending_slices` from `last_crystallization_set` minus `completed_changes` while preserving crystallization order, then re-presents the full `Auto` / `Auto (fast implementation)` / `Manual` selector when pending slices remain.

Auto and Auto-fast continuation choices operate only on pending slices. A single pending slice dispatches directly, while multiple pending slices use the existing ordered selector and `Cancel` behavior. Completed slices are never re-selected or rerun. Manual continuation dispatches nothing and leaves pending work for a later explicit request.

The implementation preserves completed progress states and keeps the exhausted-set terminal report and navigation unchanged when no pending slices remain. Worker payloads, commit ownership, and failure recovery are unchanged.

## Capabilities

### New Capabilities

No new capability is introduced; this backfill records modifications to existing exploration capabilities.

### Modified Capabilities

- `explore-pipeline-selector`: the selector is a per-slice authorization gate for remaining Auto-fast slices.
- `explore-pipeline-supervision`: successful completion records completed state before pending-slice continuation and preserves exhausted-set navigation.
- `explore-crystallization-block`: continuation selection is distinct from the initial crystallization-close handoff.
- `explore-idea-list`: completed slice progress states persist during continuation.

## Impact

- `GLOSSARY.md`: updates the Pipeline Selector definition and lifecycle description.
- `sai/commands/explore/instructions.md`: defines pending-slice filtering, per-slice selector re-presentation, deterministic selection, and Manual pause behavior.
- `test/explore-pipeline-selector.test.js`: adds regression coverage for per-slice re-presentation and Manual pausing.
- Reconstructed backfill artifacts are added under this change directory.
- Out of scope: `design.md`, `tasks.md`, `implementation.md`.
