# ADR 0147a: Three-rule composition delta lives only in command-runner.md Result Loop

<!-- adr-index: refs 0083; refs 0081 -->

## Status

Accepted

## Context

Apply needs to become chainable so a future multi-phase command can run ordered phase adapters in one invocation. Encoding composition only in a future product card would force every consumer to reimplement transitions. A new orchestration source file would split the shared lifecycle contract.

## Decision

Insert exactly three composition rules — ordered multi-adapter invocation with segment rebind and segment-scoped recovery pools; non-final `terminal_navigation` resolving only to the authorized consecutive transition; chained Isolation Mode not clearing supervisor session state — into `## Result Loop` of `sai/orchestration/command-runner.md` after the existing `terminal_navigation` behavior paragraph and before `## Bounded Recovery`. Do not add a new orchestration file and do not relocate `command-runner.md`.

## Alternatives Considered

- **New `chained-composition.md` orchestration file** — rejected; the shared runner remains the single contract home.
- **Encode composition only in a future `sai-build` card** — rejected; every multi-phase consumer would reimplement transitions unsafely.
- **Delta on the existing Result Loop** (chosen) — composition extends lifecycle validation, union, recovery, and terminal dispatch already owned there.

## Consequences

- One shared loop owns multi-adapter sequencing without a parallel control plane.
- Single-adapter invocations keep today's one-phase reading when segment scope equals invocation scope.
- Future product commands compose by declaring adapter sequences rather than forking the runner.

## Provenance

User — `openspec/changes/chainable-apply-phase-adapter/design.md`, Decision D1.
