# ADR 0166: Dual-channel exclusivity is per cause surface

<!-- adr-index: amends 0165 -->

## Status

Accepted

## Context

ADR 0165 introduced two coordinator evidence channels — independent verification vs phase-static repair-surface matching — with a sole runner registry row for design overview repair. Planning adapters now authorize non-clean inspection of main planning artifacts while remaining blind to overview content. Without a per-surface exclusivity rule, one design closure could double-key (inspection key plus `design-overview-repair`) or fall back from unresolved inspection to the static overview row.

## Decision

Channel selection is **per cause surface**, and it precedes key derivation so one closure yields at most one diagnosis key:

1. When the suspected cause surface is inside the coordinator's authorized non-clean read set, use inspection-derived Cause Locus and diagnosis key; do not also match a phase-static row for that surface.
2. When the suspected cause surface is outside that read set (design overview for the design coordinator), use the registered phase-static row (`design-overview-repair`) when its closed-field and path criteria match.
3. Authorized-but-unresolved inspection never falls back to phase-static matching; the result is unresolved with zero attempts.
4. A single design adapter MAY therefore use inspection for `design.md` / `tasks.md` / `interfaces.md` and phase-static matching for overview — two surfaces, one channel each, never both for the same surface.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Per-surface exclusivity (chosen) | Preserves overview registry; enables main-path inspection; one key per closure | Channel selection must be explicit before keying |
| Fold overview into main-path inspection | One channel only | Forces overview reads; breaks blind overview contract |
| Single channel for all design failures | Simpler prose | Either loses overview registry or blocks main-path inspection |
| Unresolved inspection falls back to static row | Fewer hard stops | Mis-keys main-path failures as overview repair |

## Consequences

- Runner Bounded Recovery owns the exclusivity rule; phase cards declare surfaces only.
- Main-path design failures cannot steal `design-overview-repair`.
- Overview failures stay on the phase-static key without coordinator overview content reads.
- Structural tests must pin no-fallback-on-unresolved and same-adapter dual-surface behavior.

## Related

- `openspec/changes/diagnosis-driven-recovery-spec-design/design.md` — Decision D3
- ADR 0165 — Dual coordinator inspection channels — verifying vs phase-static
- ADR 0158 — Shared non-clean-closure diagnosis lives in the command runner
- DDR 0152 — Cause Locus gates eligibility
