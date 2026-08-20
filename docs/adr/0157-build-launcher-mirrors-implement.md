# ADR 0157: Build launcher mirrors implement (not near-empty)

<!-- adr-index: refs 0141; refs 0142; refs 0154 -->

## Status

Accepted

## Context

Every in-scope command has a shared launcher card. Near-empty launchers exist for commands whose wrappers carried nothing beyond fetch+boot. Build phase 1 needs a bound implement-worker dispatch target before the coordinator runs. Apply RED/GREEN bindings must not live on the build launcher (D2b / ADR 0154).

## Decision

`sai/commands/build/launcher.md` loads the implementation-worker binding then fetches the build coordinator — the same two-fetch shape as `sai/commands/implement/launcher.md`. It is not near-empty. Apply RED/GREEN bindings are intentionally absent; they become available only when composition activates the apply adapter. Apply's own launcher stays near-empty. No `sai/commands/build/worker.md`.

## Alternatives Considered

- **Near-empty build launcher** — rejected; phase 1 would lack a bound implement-worker target.
- **Launcher loads implement + RED + GREEN** — rejected; duplicates apply ownership.
- **Mirror implement two-fetch shape** (chosen) — uniform with implement; apply owns Step workers.

## Consequences

- Build joins the non-empty launcher set alongside implement and the audit coordinators.
- Near-empty set remains the seven apply/utility launchers only.
- Boot still selects only `coordinator.md`; launcher is wrapper-loaded, not boot-selected.

## Provenance

User — `openspec/changes/sai-build-command/design.md`, Decision D5.
