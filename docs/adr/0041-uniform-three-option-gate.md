# ADR 0041: Uniform three-option commit gate across apply.md and commit.md

## Status

Accepted

## Context

The commit authorization gate is implemented at two call sites: the per-Step gate in `sai/instructions/apply.md` and the `sai-commit` gate in `sai/instructions/commit.md`. Adding a third option (`Allow on this session`) could be scoped to `apply.md` only, since only `apply.md`'s multi-Step loop realizes the skip-effect.

## Decision

Present the identical three-option contract (`yes (Recommended)` / `no` / `Allow on this session`) at both call sites, with identical flag-set and flag-check semantics. Within a single `sai-commit` invocation the skip-effect is inert (the flag is set but never read before the next invocation resets it), but uniformity keeps one contract to reason about.

## Alternatives Considered

- **Apply-only third option.** Rejected: would fork the shared `commit-auth-gate` capability contract, contradict the spec-level requirement that "The commit authorization gate SHALL offer a third option", and create two divergent gate prompts to maintain.
- **Uniform contract** (chosen): accepts the inert skip-effect in `commit.md` for the benefit of a single, capability-level gate contract.

## Consequences

- `commit.md` carries the third option even though its skip-effect is inert in a one-shot flow. Revisit if `sai-commit` ever becomes multi-commit.
- Any future gate change applies to both files consistently.
