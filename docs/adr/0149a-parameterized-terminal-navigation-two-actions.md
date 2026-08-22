# ADR 0149a: Parameterized terminal_navigation binds two actions; no phase fork

<!-- adr-index: refs 0083; refs 0148a -->

## Status

Accepted

## Context

Standalone `/sai-4-apply` must keep printing the pinned completion literal and stopping. A chained non-final apply must transition without editing change resolution. Forking apply into standalone vs chained coordinator cards would duplicate the phase and drift.

## Decision

Keep `terminal_navigation` as a single adapter field whose binding is positional: sole adapter (direct `/sai-4-apply`) and final adapter in a multi-adapter sequence bind the shell-owned standalone completion action; a non-final adapter binds the composition-owned authorized transition only. The standalone completion action remains exactly: after Final sweep, human verification, and commits succeed, print `Implementation applied. Run `/sai-5-review {name}` in a new chat when ready.` and stop. Completion gates are unchanged; only which bound action runs after gates pass is parameterized.

## Alternatives Considered

- **Fork apply into standalone vs chained coordinator cards** — rejected; duplicates the phase and drifts.
- **Suppress completion by editing change resolution on the chained path** — rejected by specs.
- **One field, two bound actions, positional selection** (chosen) — matches the composition model and preserves the pinned literal for sole/final apply.

## Consequences

- Chained consumers suppress the standalone terminal without touching picker or prerequisites.
- Final chained apply still closes with the same user-facing completion message as direct apply.
- Incomplete apply still withholds both completion and transition.

## Provenance

User — `openspec/changes/chainable-apply-phase-adapter/design.md`, Decision D3.
