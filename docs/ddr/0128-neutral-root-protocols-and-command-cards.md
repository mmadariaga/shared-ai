# DDR 0128: Neutral root protocols and command cards

## Status

Superseded

The placement rule is superseded by `docs/ddr/0149-orchestration-core-contracts-live-under-orchestration.md`. The harness-neutral, phase-agnostic protocol decision recorded below remains in force; only the two file locations changed.

## Context

The command pipeline needs one authoritative command-runner protocol and one authoritative worker-core protocol while still allowing each command card to select its own phase behavior. Keeping phase branches in the shared protocols would make the root contracts depend on individual command names and would recreate the coupling this layout change removes.

## Decision

Place the harness-neutral command protocol at `sai/command-runner.md` and the harness-neutral worker lifecycle protocol at `sai/worker-core.md`. Command cards declare the behavior they need through their card class and flags; the root protocols provide reusable mechanics and do not branch on harness or phase names.

## Alternatives Considered

- Keep separate orchestration copies — rejected because duplicated lifecycle mechanics would drift.
- Add phase branches to the root protocols — rejected because every new phase would require editing shared protocol machinery.

## Consequences

Every routed or utility command can extend the pipeline through its card folder without creating another root-protocol branch. Existing callers and projections must use the new root paths, and future protocol changes are centralized in two files.

## Provenance

User — the target layout and card-selected behavior are explicit design decisions for this change.
