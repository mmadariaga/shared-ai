# ADR 0156: Build injects apply fast-track unconditionally; composition owns the banner

<!-- adr-index: refs 0153b; refs 0048; refs 0051; refs ddr:0052 -->

## Status

Accepted

## Context

Operators want `/sai-build` to apply without re-authorizing commits or stopping for per-step Human Verification on the happy path. Apply already defines fast-track semantics (commit pre-auth, non-detached branch auto-stay, deferred combined HV). Chained apply skips the standalone shell parse that would emit the FAST-TRACK banner, so a second owner is required. `/sai-build` must not become a fifth body-file parse member.

## Decision

Build always injects fast-track true into the apply segment. Explicit `--fast-track` on `/sai-build` is a behavioral no-op. The supervising build coordinator emits `> FAST-TRACK MODE ACTIVE` exactly once at apply-segment activation and zero times when apply never activates. Apply's skipped shell must not print a second banner. Injected fast-track still means: commit pre-authorization, non-detached branch auto-stay, deferred combined Human Verification as a post-commit report after Final sweep. Detached HEAD still presents the three-option branch prompt. Safe-operations confirmations remain.

## Alternatives Considered

- **Make `/sai-build` a fifth parse member** — rejected; confuses the closed four-command parse set.
- **Require user `--fast-track` on build** — rejected; the composition is gate-light by design.
- **Unconditional injection with composition-owned banner** (chosen) — matches chained-apply skip of shell parse.

## Consequences

- Happy path has no intermediate plan approval and no HV approval gate under fast-track.
- Banner count is testable: once on apply activation, zero when phase 1 fails/cancels.
- Non-removable apply stops stay in force under injection.

## Provenance

User — `openspec/changes/sai-build-command/design.md`, Decision D4.
