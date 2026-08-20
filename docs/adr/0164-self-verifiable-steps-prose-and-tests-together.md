# ADR 0164: Self-verifiable Steps — prose and pinning tests land together

## Status

Accepted

## Context

Deferring test repairs to a later Step reproduces this change's own triggering defect inside the fix plan and collides with one-repair-per-segment limits under the new rules. The repository's contract-test idiom already pins normative phrases in the same commit as the prose.

## Decision

Every `tasks.md` Step that changes a normative surface also updates the contract tests that pin that surface in the same Step. No Step may declare broken tests deferred to a later Step. Cross-cutting inheritance/compat suites (`build-coordinator`, `design-coordinator-worker`) land only after the shared runner and Apply cards they assert against already match the new phrases. Glossary terms land with determinate mechanical checks in their own Step.

## Alternatives Considered

| Option | Pro | Con |
|---|---|---|
| Prose and pinning tests together (chosen) | Self-verifiable Steps; matches checklist-before-commit | Larger per-Step diffs |
| Deferred test-repair Step | Smaller early Steps | Reproduces the triggering defect; collides with one-repair cap |
| One mega-Step for all cards and tests | Single green checkpoint | Loses reviewable commit boundaries |

## Consequences

- Each Step's Verification Checklist can pass without depending on a later Step.
- Oversized runner work is split across green checkpoints (core ledger, then registry).
- Applies to this change's own implementation plan structure.

## Related

- `openspec/changes/diagnosis-driven-recovery-apply/design.md` — Decision D9
